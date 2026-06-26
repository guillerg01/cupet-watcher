import type { DetectionInput, DetectionEventDraft } from "@/core/detection/types";

/**
 * Pure, deterministic detection function.
 * For each station in `current`:
 *   - Not in prior → NEW
 *   - In prior but was inactive (departed) → REAPPEARED
 *   - Was at 0 disponibilidades, now > 0 → BECAME_AVAILABLE
 *   - Was not admiteSalaEspera, now is → WAITROOM_ENABLED
 * At most one event per station; priority NEW > REAPPEARED > others.
 */
export function detect(input: DetectionInput): DetectionEventDraft[] {
  const events: DetectionEventDraft[] = [];

  for (const station of input.current) {
    const prior = input.prior.get(station.id);

    if (prior === undefined) {
      // Brand-new station — highest priority event
      events.push({
        stationId: station.id,
        provinceName: station.provinceName,
        type: "NEW",
      });
      continue;
    }

    if (!prior.active) {
      // Known cupet that had left the catalog and is back — the critical
      // "reappeared" signal. Takes priority over availability/waitroom diffs.
      events.push({
        stationId: station.id,
        provinceName: station.provinceName,
        type: "REAPPEARED",
      });
      continue;
    }

    if (prior.disponibilidades === 0 && station.disponibilidades > 0) {
      events.push({
        stationId: station.id,
        provinceName: station.provinceName,
        type: "BECAME_AVAILABLE",
      });
      continue;
    }

    if (!prior.admiteSalaEspera && station.admiteSalaEspera) {
      events.push({
        stationId: station.id,
        provinceName: station.provinceName,
        type: "WAITROOM_ENABLED",
      });
    }
  }

  return events;
}
