import { getDeviceCreds, getTicketSession } from "../lib/secure-store";
import { heartbeat, pollAssignment, ingestCatalog } from "../lib/backend-api";
import { sweepFuelCatalog, getProvinces } from "../lib/ticket-client";

export interface CycleResult {
  ran: boolean;
  reason?: string;
  stations: number;
  newEvents: number;
}

type Log = (m: string) => void;

/** Sweep the full fuel catalog and sync it to the backend (detects new cupets). */
async function doCatalogSweep(
  commandToken: string,
  ticketToken: string,
  assignmentId: string | undefined,
  log: Log,
): Promise<CycleResult> {
  log("Sweeping fuel catalog…");
  let provinces;
  try {
    provinces = await getProvinces(ticketToken);
  } catch {
    provinces = undefined;
  }

  const stations = await sweepFuelCatalog(ticketToken, (page, last) => {
    if (page % 5 === 0 || page === last) log(`  catalog page ${page}/${last}`);
  });
  log(`Got ${stations.length} fuel stations. Syncing…`);

  const r = await ingestCatalog(commandToken, {
    assignmentId,
    complete: true,
    provinces,
    stations,
  });
  log(`Synced ${r.seen}. New cupets: ${r.newEvents} 🎉`);
  return { ran: true, stations: r.stations, newEvents: r.newEvents };
}

/**
 * One coordinator-driven cycle: heartbeat → poll → if assigned a CATALOG sweep,
 * run it. Safe from the foreground or a background task.
 */
export async function runWorkerCycle(log: Log = () => {}): Promise<CycleResult> {
  const device = await getDeviceCreds();
  if (!device) {
    log("No device — register first.");
    return { ran: false, reason: "no-device", stations: 0, newEvents: 0 };
  }
  const ticket = await getTicketSession();
  const ticketValid = !!ticket && ticket.exp > Date.now();

  try {
    await heartbeat(device.commandToken, { ticketLinked: ticketValid });
  } catch (e) {
    log(`Heartbeat failed: ${String(e)}`);
  }

  if (!ticketValid) {
    log("Ticket session expired — log in again.");
    return { ran: false, reason: "no-ticket", stations: 0, newEvents: 0 };
  }

  let assignment;
  try {
    assignment = await pollAssignment(device.commandToken);
  } catch (e) {
    log(`Poll failed: ${String(e)}`);
    return { ran: false, reason: "poll-failed", stations: 0, newEvents: 0 };
  }

  if (!assignment) {
    log("No sweep assigned this cycle.");
    return { ran: true, stations: 0, newEvents: 0 };
  }

  return doCatalogSweep(device.commandToken, ticket!.token, assignment.id, log);
}

/** Manual sweep (button) — runs regardless of assignment. */
export async function runManualSweep(log: Log = () => {}): Promise<CycleResult> {
  const device = await getDeviceCreds();
  const ticket = await getTicketSession();
  if (!device) {
    log("No device — register first.");
    return { ran: false, reason: "no-device", stations: 0, newEvents: 0 };
  }
  if (!ticket || ticket.exp <= Date.now()) {
    log("No valid ticket session — log in first.");
    return { ran: false, reason: "no-ticket", stations: 0, newEvents: 0 };
  }
  try {
    await heartbeat(device.commandToken, { ticketLinked: true });
  } catch {
    /* ignore */
  }
  return doCatalogSweep(device.commandToken, ticket.token, undefined, log);
}
