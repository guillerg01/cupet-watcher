import type { FuelStation } from "@/core/station/types";

export type DetectionType = "NEW" | "BECAME_AVAILABLE" | "WAITROOM_ENABLED";

export interface DetectionEventDraft {
  stationId: number;
  provinceName: string;
  type: DetectionType;
}

// Minimal prior state needed to diff (what we already persisted)
export interface PriorStationState {
  id: number;
  admiteSalaEspera: boolean;
  disponibilidades: number;
}

export interface DetectionInput {
  prior: Map<number, PriorStationState>;
  current: FuelStation[];
}
