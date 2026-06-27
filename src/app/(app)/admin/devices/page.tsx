import { requireAdmin } from "@/lib/admin";
import { repo, Device, Assignment } from "@/infra/db";

export const dynamic = "force-dynamic";

const ONLINE_MS = 5 * 60 * 1000;

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#F4A340",
  CLAIMED: "#1FD6A6",
  DONE: "#1FD6A6",
  EXPIRED: "#E05252",
};

function ago(d: Date | null, now: number): string {
  if (!d) return "—";
  const s = Math.round((now - d.getTime()) / 1000);
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.round(s / 60)}m`;
  if (s < 86400) return `hace ${Math.round(s / 3600)}h`;
  return `hace ${Math.round(s / 86400)}d`;
}

export default async function AdminDevicesPage(): Promise<React.JSX.Element> {
  await requireAdmin();

  const deviceRepo = await repo(Device);
  const assignmentRepo = await repo(Assignment);

  const [devices, recentAssignments] = await Promise.all([
    deviceRepo.find({ order: { lastHeartbeatAt: "DESC", createdAt: "DESC" }, take: 200 }),
    assignmentRepo.find({ order: { createdAt: "DESC" }, take: 400 }),
  ]);

  // Latest assignment per device (recentAssignments is newest-first).
  const lastByDevice = new Map<string, Assignment>();
  for (const a of recentAssignments) {
    if (a.deviceId && !lastByDevice.has(a.deviceId)) lastByDevice.set(a.deviceId, a);
  }

  const fmt = new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" });
  const now = Date.now();

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Workers móviles que reportan cupets ({devices.length}) · el último escaneo muestra el estado
        del barrido más reciente asignado a cada device.
      </p>
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--surface)" }}>
            <tr>
              {["Cuenta", "Estado", "Push", "Ticket", "Prov.", "Heartbeat", "Último escaneo", "Log scan (app)", "Registro"].map((h) => (
                <th key={h} className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-4 text-center" style={{ color: "var(--text-muted)" }}>
                  Sin dispositivos registrados
                </td>
              </tr>
            ) : (
              devices.map((d) => {
                const online = d.lastHeartbeatAt != null && now - d.lastHeartbeatAt.getTime() < ONLINE_MS;
                const last = lastByDevice.get(d.id);
                const watch = Array.isArray(d.watchProvinceIds) ? d.watchProvinceIds.length : 0;
                return (
                  <tr key={d.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="p-3 font-mono text-xs" style={{ color: "var(--text)" }}>{d.xutilUsername}</td>
                    <td className="p-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{
                          background: online ? "rgba(31,214,166,0.12)" : "rgba(139,156,180,0.12)",
                          color: online ? "#1FD6A6" : "#8B9CB4",
                        }}
                      >
                        {online ? "online" : "offline"}
                      </span>
                    </td>
                    <td className="p-3 text-xs" style={{ color: d.pushToken ? "#1FD6A6" : "#E05252" }}>
                      {d.pushToken ? "sí" : "no"}
                    </td>
                    <td className="p-3 text-xs" style={{ color: d.ticketLinked ? "#1FD6A6" : "var(--text-muted)" }}>
                      {d.ticketLinked ? "sí" : "no"}
                    </td>
                    <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      {watch === 0 ? "todas" : watch}
                    </td>
                    <td className="p-3 whitespace-nowrap text-xs" style={{ color: "var(--text-muted)" }}>
                      {d.lastHeartbeatAt ? ago(d.lastHeartbeatAt, now) : "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap text-xs">
                      {last ? (
                        <span style={{ color: STATUS_COLOR[last.status] ?? "var(--text-muted)" }}>
                          {last.status}
                          {last.attempts > 1 ? ` ·${last.attempts}x` : ""} · {ago(last.createdAt, now)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>nunca</span>
                      )}
                    </td>
                    <td className="p-3 text-xs" style={{ maxWidth: 260 }}>
                      {d.lastScanStage ? (
                        <div>
                          <span style={{ color: d.lastScanError ? "#E05252" : "#1FD6A6" }}>
                            {d.lastScanStage}
                          </span>
                          <span style={{ color: "var(--text-muted)" }}>
                            {" "}· {d.lastScanLogAt ? ago(d.lastScanLogAt, now) : ""}
                          </span>
                          {d.lastScanError && (
                            <div style={{ color: "#E05252", marginTop: 2 }}>{d.lastScanError}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap text-xs" style={{ color: "var(--text-muted)" }}>
                      {fmt.format(d.createdAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
