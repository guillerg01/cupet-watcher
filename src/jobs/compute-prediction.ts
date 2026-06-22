import { prisma } from "@/infra/db/prisma";
import { scoreSamples, type PredictSample } from "@/core/prediction/predict";
import type { Prisma } from "@prisma/client";

interface RawSampleRow {
  stationid: number;
  provinceid: number;
  dow: number;
  hour: number;
  queueposicion: number | null;
  queuetotal: number | null;
  disponibilidades: number;
}

export async function runComputePrediction(): Promise<{ buckets: number }> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Pull samples from last 30 days with dow/hour extracted in Postgres
  const rows = await prisma.$queryRaw<RawSampleRow[]>`
    SELECT
      ss."stationId"       AS stationid,
      s."provinceId"       AS provinceid,
      EXTRACT(DOW FROM ss.ts)::int  AS dow,
      EXTRACT(HOUR FROM ss.ts)::int AS hour,
      ss."queuePosicion"   AS queueposicion,
      ss."queueTotal"      AS queuetotal,
      ss."disponibilidades" AS disponibilidades
    FROM "StationSnapshot" ss
    JOIN "Station" s ON s.id = ss."stationId"
    WHERE ss.ts >= ${cutoff}
  `;

  // Group samples by scope
  const stationSamples = new Map<string, PredictSample[]>();
  const provinceSamples = new Map<string, PredictSample[]>();

  for (const row of rows) {
    const sample: PredictSample = {
      dow: row.dow,
      hour: row.hour,
      posicion: row.queueposicion,
      total: row.queuetotal,
      disponibilidades: row.disponibilidades,
    };

    const stationScope = `station:${row.stationid}`;
    const provinceScope = `province:${row.provinceid}`;

    const ss = stationSamples.get(stationScope) ?? [];
    ss.push(sample);
    stationSamples.set(stationScope, ss);

    const ps = provinceSamples.get(provinceScope) ?? [];
    ps.push(sample);
    provinceSamples.set(provinceScope, ps);
  }

  let buckets = 0;
  const now = new Date();

  async function upsertBuckets(
    scope: string,
    samples: PredictSample[],
  ): Promise<void> {
    const scored = scoreSamples(samples);
    for (const b of scored) {
      await prisma.predictionCache.upsert({
        where: { scope_dow_hour: { scope, dow: b.dow, hour: b.hour } },
        create: {
          scope,
          dow: b.dow,
          hour: b.hour,
          avgFill: b.avgFill,
          avgAvail: b.avgAvail,
          samples: b.samples,
          score: b.score,
          computedAt: now,
        },
        update: {
          avgFill: b.avgFill,
          avgAvail: b.avgAvail,
          samples: b.samples,
          score: b.score,
          computedAt: now,
        },
      });
      buckets++;
    }
  }

  for (const [scope, samples] of stationSamples) {
    try {
      await upsertBuckets(scope, samples);
    } catch (err) {
      console.error(`[compute-prediction] Failed scope ${scope}:`, err);
    }
  }

  for (const [scope, samples] of provinceSamples) {
    try {
      await upsertBuckets(scope, samples);
    } catch (err) {
      console.error(`[compute-prediction] Failed scope ${scope}:`, err);
    }
  }

  console.log(`[compute-prediction] Upserted ${buckets} prediction buckets`);
  return { buckets };
}
