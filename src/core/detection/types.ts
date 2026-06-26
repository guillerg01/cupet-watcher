import type { FuelStation } from "@/core/station/types";

export type DetectionType =
  | "NEW"
  | "REAPPEARED"
  | "DEPARTED"
  | "BECAME_AVAILABLE"
  | "WAITROOM_ENABLED";

export interface DetectionEventDraft {
  stationId: number;
  provinceName: string;
  type: DetectionType;
}

// Minimal prior state needed to diff (what we already persisted).
// `active` is what lets us tell a reappeared cupet (was active=false, now seen)
// apart from one that simply stayed in the catalog.
export interface PriorStationState {
  id: number;
  admiteSalaEspera: boolean;
  disponibilidades: number;
  active: boolean;
  provinceName: string;
}

export interface DetectionInput {
  prior: Map<number, PriorStationState>;
  current: FuelStation[];
}
