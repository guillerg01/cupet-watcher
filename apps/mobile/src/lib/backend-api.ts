import { BACKEND_URL } from "./config";
import type { FuelStationDTO, ProvinceDTO } from "./ticket-client";

// Talks to the coordinator backend (the refactored Next.js app).

export type AssignmentKind = "CATALOG" | "DETAIL";

export interface Assignment {
  id: string;
  kind: AssignmentKind;
  stationIds: number[];
}

function authHeaders(commandToken: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${commandToken}`,
  };
}

/** Register this device under the ticket username the user logged in with. */
export async function registerDevice(
  xutilUsername: string,
  opts: { pushToken?: string; deviceId?: string } = {},
): Promise<{ deviceId: string; commandToken: string }> {
  const res = await fetch(`${BACKEND_URL}/api/devices/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ xutilUsername, platform: "android", ...opts }),
  });
  if (!res.ok) throw new Error(`register HTTP ${res.status}`);
  return res.json();
}

export async function heartbeat(
  commandToken: string,
  body: { ticketLinked?: boolean; pushToken?: string },
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/devices/heartbeat`, {
    method: "POST",
    headers: authHeaders(commandToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`heartbeat HTTP ${res.status}`);
}

export async function pollAssignment(commandToken: string): Promise<Assignment | null> {
  const res = await fetch(`${BACKEND_URL}/api/devices/poll`, {
    method: "GET",
    headers: authHeaders(commandToken),
  });
  if (!res.ok) throw new Error(`poll HTTP ${res.status}`);
  const json = (await res.json()) as { assignment: Assignment | null };
  return json.assignment;
}

export interface CatalogIngestResult {
  stations: number;
  seen: number;
  newEvents: number;
}

export async function ingestCatalog(
  commandToken: string,
  payload: {
    assignmentId?: string;
    complete: boolean;
    provinces?: ProvinceDTO[];
    stations: FuelStationDTO[];
  },
): Promise<CatalogIngestResult> {
  const res = await fetch(`${BACKEND_URL}/api/ingest/catalog`, {
    method: "POST",
    headers: authHeaders(commandToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`ingest HTTP ${res.status}`);
  return res.json();
}
