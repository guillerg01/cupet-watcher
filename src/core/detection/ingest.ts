import type { DetectionType } from "@/core/detection/types";

/**
 * Detection for a single submitted station detail (the ingest path).
 * Mirrors the rules in `detect()` but works against the persisted Station state
 * vs the freshly-fetched detail a phone just submitted.
 *
 * NEW is intentionally NOT handled here: brand-new station discovery comes from
 * a catalog sweep, not from detail ingest of an already-known station.
 */
export interface IngestPrior {
  admiteSalaEspera: boolean;
  disponibilidades: number;
}

export interface IngestCurrent {
  disponible: boolean;
  disponibilidades: number;
  admiteSalaEspera: boolean;
}

// Detail-ingest only diffs availability/waitroom on an already-known, active
// station; NEW and REAPPEARED come from the catalog sweep, not from here.
export type IngestDetection = Exclude<DetectionType, "NEW" | "REAPPEARED" | "DEPARTED">;

export function detectFromSnapshot(
  prior: IngestPrior,
  current: IngestCurrent,
): IngestDetection | null {
  if (prior.disponibilidades === 0 && current.disponibilidades > 0) {
    return "BECAME_AVAILABLE";
  }
  if (!prior.admiteSalaEspera && current.admiteSalaEspera) {
    return "WAITROOM_ENABLED";
  }
  return null;
}
