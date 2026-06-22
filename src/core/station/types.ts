// Domain model — framework-free. Mapped from RawService.

export interface FuelStation {
  id: number; // xutil local_servicio id
  name: string;
  establishment: string;
  provinceName: string;
  municipio: string | null;
  admiteSalaEspera: boolean;
  tieneValidacion: boolean;
  disponibilidades: number;
  rating: number | null;
  views: number | null;
}

// Snapshot of availability/queue at a point in time
export interface AvailabilitySample {
  stationId: number;
  disponible: boolean;
  disponibilidades: number;
  views: number | null;
  rating: number | null;
  queuePosicion: number | null;
  queueTotal: number | null;
}
