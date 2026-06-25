import { db, repo, Province, Station, StationSnapshot } from "@/infra/db";
import { createXutilClient } from "@/infra/xutil/client";
import { getScraperToken } from "@/infra/xutil/token-store";
import type { ServicioDetail } from "@/infra/xutil/types";

function parseCoord(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

async function resolveProvinceId(provinceName: string): Promise<number | null> {
  const provinceRepo = await repo(Province);
  const target = provinceName.trim().toUpperCase();
  const all = await provinceRepo.find();
  const match = all.find((p) => p.name.trim().toUpperCase() === target);
  return match?.id ?? null;
}

export async function refreshStationFromXutil(
  stationId: number,
): Promise<{ station: Station; detail: ServicioDetail }> {
  const token = await getScraperToken();
  const client = createXutilClient();
  const detail = await client.getServicioDetail(token, stationId);

  const provinceId = await resolveProvinceId(detail.provincia);
  if (provinceId === null) {
    throw new Error(`[sync-detail] Unknown province: ${detail.provincia}`);
  }

  const now = new Date();
  const lat = parseCoord(detail.latitud);
  const lng = parseCoord(detail.longitud);
  const stationRepo = await repo(Station);
  const existing = await stationRepo.findOne({ where: { id: stationId } });

  // NOTE (v2): this helper does a SERVER-SIDE ticket fetch (getScraperToken) and
  // is architecturally dead — the server has no Cuban IP. Remove or repurpose so
  // the phone fetches detail and POSTs it to /api/ingest/snapshot.
  const payload = {
    id: stationId,
    name: detail.nombre,
    establishment: detail.establecimiento,
    provinceId,
    municipio: detail.municipio ?? null,
    lat,
    lng,
    admiteSalaEspera: detail.admite_sala_espera_virtual === 1,
    tieneValidacion: detail.tiene_validacion === 1,
    disponibilidades: detail.disponibilidades,
    active: true,
    lastSeenAt: now,
    detailCache: detail as unknown as Record<string, unknown>,
    detailFetchedAt: now,
  };

  if (existing) {
    // save() merges by primary key, leaving untouched columns intact.
    await stationRepo.save(payload as Station);
  } else {
    await stationRepo.save({
      ...payload,
      firstSeenAt: now,
    } as Station);
  }

  const snapshotRepo = await repo(StationSnapshot);
  await snapshotRepo.save({
    stationId,
    disponible: detail.disponible,
    disponibilidades: detail.disponibilidades,
    views: detail.views,
    rating: null,
    queuePosicion: null,
    queueTotal: null,
  });

  const dataSource = await db();
  const station = await dataSource.getRepository("Station").findOne({
    where: { id: stationId },
    relations: { province: true, snapshots: true },
  });

  if (!station) {
    throw new Error(`[sync-detail] Station ${stationId} missing after save`);
  }

  return { station: station as Station, detail };
}
