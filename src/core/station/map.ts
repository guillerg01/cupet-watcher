import type { RawService } from "@/infra/xutil/types";
import { FUEL_ACTIVITY_ID } from "@/infra/xutil/types";
import type { FuelStation } from "@/core/station/types";

/**
 * Returns true when the service belongs to the fuel activity category.
 * Checked via `subcategorias_actividades[].id_actividad === FUEL_ACTIVITY_ID`.
 */
export function isFuelService(raw: RawService): boolean {
  return raw.subcategorias_actividades.some(
    (s) => s.id_actividad === FUEL_ACTIVITY_ID,
  );
}

/**
 * Maps a RawService into the domain FuelStation model.
 * `admiteSalaEspera` and `tieneValidacion` are coerced from 0|1 int flags.
 * `rating` and `views` are nullable — upstream can send 0 as a meaningful value
 * so we keep them (only null when upstream explicitly omits them).
 */
export function toFuelStation(raw: RawService): FuelStation {
  return {
    id: raw.id,
    name: raw.nombre,
    establishment: raw.establishment,
    provinceName: raw.provincia,
    municipio: raw.municipio ?? null,
    // Upstream stores booleans as integer 0|1
    admiteSalaEspera: raw.admite_sala_espera_virtual === 1,
    tieneValidacion: raw.tiene_validacion === 1,
    disponibilidades: raw.disponibilidades,
    // rating/views kept as-is; contract says nullable
    rating: raw.rating ?? null,
    views: raw.views ?? null,
  };
}
