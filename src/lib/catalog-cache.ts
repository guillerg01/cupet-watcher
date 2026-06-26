import type { FuelStation } from "@/core/station/types";

export function catalogCacheFromStation(station: FuelStation): Record<string, unknown> {
  return {
    rating: station.rating,
    views: station.views,
    image_url: station.imageUrl,
    disponibilidades: station.disponibilidades,
    admite_sala_espera_virtual: station.admiteSalaEspera ? 1 : 0,
    tiene_validacion: station.tieneValidacion ? 1 : 0,
    syncedAt: new Date().toISOString(),
  };
}
