/**
 * Pure prediction / aggregation utilities.
 * No I/O, no Date.now(), deterministic.
 */

/** One raw sample row (from DB or in-memory). */
export interface PredictSample {
  dow: number; // 0=Sun … 6=Sat
  hour: number; // 0–23
  posicion: number | null; // user position in queue (null if not in queue)
  total: number | null; // total queue length (null if not in queue)
  disponibilidades: number; // slots available at sample time
}

/**
 * Aggregated bucket for a (dow, hour) pair.
 * score: higher = better moment to go fuel (less crowded, more available).
 */
export interface PredictBucket {
  dow: number;
  hour: number;
  /** Mean of (posicion / total) where total > 0; 0..1; lower = emptier queue. */
  avgFill: number;
  /** Mean of disponibilidades across samples. */
  avgAvail: number;
  /** Number of raw samples that contributed to this bucket. */
  samples: number;
  /**
   * Composite score in 0..1; higher = better moment.
   * score = (1 - avgFill) * 0.7 + normalizedAvail * 0.3
   * normalizedAvail = min(avgAvail, 1) so a single slot already counts as "available".
   */
  score: number;
}

type BucketKey = `${number}-${number}`;

/**
 * Aggregates raw samples into per-(dow,hour) buckets and computes a score.
 * Returns an empty array when no samples are provided.
 */
export function scoreSamples(samples: PredictSample[]): PredictBucket[] {
  if (samples.length === 0) return [];

  // Accumulator keyed by "dow-hour"
  const acc = new Map<
    BucketKey,
    {
      dow: number;
      hour: number;
      fillSum: number;
      fillCount: number;
      availSum: number;
      count: number;
    }
  >();

  for (const s of samples) {
    const key: BucketKey = `${s.dow}-${s.hour}`;
    let bucket = acc.get(key);
    if (!bucket) {
      bucket = {
        dow: s.dow,
        hour: s.hour,
        fillSum: 0,
        fillCount: 0,
        availSum: 0,
        count: 0,
      };
      acc.set(key, bucket);
    }

    bucket.count += 1;
    bucket.availSum += s.disponibilidades;

    // Only include fill ratio when total is a positive number
    if (s.total !== null && s.total > 0 && s.posicion !== null) {
      bucket.fillSum += s.posicion / s.total;
      bucket.fillCount += 1;
    }
  }

  const results: PredictBucket[] = [];

  for (const b of acc.values()) {
    const avgFill = b.fillCount > 0 ? b.fillSum / b.fillCount : 0;
    const avgAvail = b.availSum / b.count;

    // normalizedAvail: clamp to 0..1 so a station with 1+ slot scores as "available"
    const normalizedAvail = Math.min(avgAvail, 1);

    // Weighted composite: queue emptiness counts 70%, availability 30%
    const score = (1 - avgFill) * 0.7 + normalizedAvail * 0.3;

    results.push({
      dow: b.dow,
      hour: b.hour,
      avgFill,
      avgAvail,
      samples: b.count,
      score,
    });
  }

  // Sort descending by score (best moment first)
  results.sort((a, b) => b.score - a.score);

  return results;
}
