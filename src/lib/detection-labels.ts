import { DetectionType } from "@/infra/db";
import type { DetectionEventDraft } from "@/core/detection/types";

export interface CatalogEventSummary {
  new: number;
  reappeared: number;
  departed: number;
  becameAvailable: number;
  waitroomEnabled: number;
  total: number;
}

export function summarizeDetectionEvents(
  drafts: Array<{ type: string }>,
): CatalogEventSummary {
  const summary: CatalogEventSummary = {
    new: 0,
    reappeared: 0,
    departed: 0,
    becameAvailable: 0,
    waitroomEnabled: 0,
    total: drafts.length,
  };
  for (const d of drafts) {
    switch (d.type) {
      case DetectionType.NEW:
        summary.new++;
        break;
      case DetectionType.REAPPEARED:
        summary.reappeared++;
        break;
      case DetectionType.DEPARTED:
        summary.departed++;
        break;
      case DetectionType.BECAME_AVAILABLE:
        summary.becameAvailable++;
        break;
      case DetectionType.WAITROOM_ENABLED:
        summary.waitroomEnabled++;
        break;
      default:
        break;
    }
  }
  return summary;
}

export function detectionPushTitle(type: DetectionType | string): string {
  switch (type) {
    case DetectionType.NEW:
      return "Cupet nuevo en el listado";
    case DetectionType.REAPPEARED:
      return "Cupet reapareció en el listado";
    case DetectionType.DEPARTED:
      return "Cupet salió del listado";
    case DetectionType.BECAME_AVAILABLE:
      return "Cupet con disponibilidad";
    case DetectionType.WAITROOM_ENABLED:
      return "Sala de espera habilitada";
    default:
      return "Cambio en cupet";
  }
}

export function detectionPushBody(
  type: DetectionType | string,
  name: string,
  provinceName: string,
): string {
  const place = `${name} · ${provinceName}`;
  switch (type) {
    case DetectionType.NEW:
      return `Nuevo en ticket.xutil.net — ${place}`;
    case DetectionType.REAPPEARED:
      return `Volvió al listado — ${place}`;
    case DetectionType.DEPARTED:
      return `Ya no aparece en el listado — ${place}`;
    default:
      return place;
  }
}

export function formatCatalogChangeSummary(summary: CatalogEventSummary): string {
  const parts: string[] = [];
  if (summary.new > 0) {
    parts.push(`${summary.new} nuevo${summary.new === 1 ? "" : "s"}`);
  }
  if (summary.reappeared > 0) {
    parts.push(`${summary.reappeared} reapareció${summary.reappeared === 1 ? "" : "n"}`);
  }
  if (summary.departed > 0) {
    parts.push(`${summary.departed} salió${summary.departed === 1 ? "" : "ron"} del listado`);
  }
  if (summary.becameAvailable > 0) {
    parts.push(`${summary.becameAvailable} con cupos`);
  }
  if (summary.waitroomEnabled > 0) {
    parts.push(`${summary.waitroomEnabled} con sala de espera`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Sin cambios en el listado";
}

export function catalogListChangeCount(summary: CatalogEventSummary): number {
  return summary.new + summary.reappeared + summary.departed;
}
