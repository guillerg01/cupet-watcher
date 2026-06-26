import { requireAdmin } from "@/lib/admin";
import { repo, Assignment, Device, AssignmentStatus } from "@/infra/db";
import { getScanIntervalMinutes } from "@/lib/app-settings";
import StatCard from "@/components/StatCard";

export const dynamic = "force-dynamic";

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

export default async function AdminScansPage(): Promise<React.JSX.Element> {
  await requireAdmin();

  const assignmentRepo = await repo(Assignment);
  const deviceRepo = await repo(Device);

  const [assignments, devices, intervalMin] = await Promise.all([
    assignmentRepo.find({ order: { createdAt: "DESC" }, take: 100 }),
    deviceRepo.find(),
    getScanIntervalMinutes(),
  ]);

  const deviceName = new Map(devices.map((d) => [d.id, d.xutilUsername]));
  const now = Date.now();
  const fmt = new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "medium" });

  // Next scan ETA = last sweep created + interval.
  const lastSweep = assignments[0];
  const nextScanMs = lastSweep
    ? lastSweep.createdAt.getTime() + intervalMin * 60 * 1000
    : now;
  const etaSec = Math.max(0, Math.round((nextScanMs - now) / 1000));
  const etaLabel =
    etaSec === 0 ? "ahora / en el próximo ciclo" : etaSec < 60 ? `${etaSec}s` : `${Math.round(etaSec / 60)}m`;

  const done = assignments.filter((a) => a.status === AssignmentStatus.DONE).length;
  const failed = assignments.filter((a) => a.status === AssignmentStatus.EXPIRED).length;
  const pending = assignments.filter(
    (a) => a.status === AssignmentStatus.PENDING || a.status === AssignmentStatus.CLAIMED,
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Intervalo" value={`${intervalMin} min`} />
        <StatCard label="Próximo escaneo" value={etaLabel} />
        <StatCard label="Completados (100)" value={done} accent={done > 0} />
        <StatCard label="Fallidos/expirados" value={failed} accent={failed > 0} />
      </div>

      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Historial de asignaciones de barrido · {pending} en curso · último{" "}
        {lastSweep ? ago(lastSweep.createdAt, now) : "—"}
      </p>

      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--surface)" }}>
            <tr>
              {["Dispositivo", "Tipo", "Estado", "Intentos", "Creado", "Reclamado", "Completado"].map((h) => (
                <th key={h} className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center" style={{ color: "var(--text-muted)" }}>
                  Sin escaneos registrados
                </td>
              </tr>
            ) : (
              assignments.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td className="p-3 font-mono text-xs" style={{ color: "var(--text)" }}>
                    {a.deviceId ? deviceName.get(a.deviceId) ?? a.deviceId.slice(0, 8) : "—"}
                  </td>
                  <td className="p-3" style={{ color: "var(--text-muted)" }}>{a.kind}</td>
                  <td className="p-3">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{
                        background: `${STATUS_COLOR[a.status] ?? "#526175"}22`,
                        color: STATUS_COLOR[a.status] ?? "var(--text-muted)",
                      }}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="p-3" style={{ color: a.attempts > 1 ? "#E05252" : "var(--text-muted)" }}>
                    {a.attempts}
                  </td>
                  <td className="p-3 whitespace-nowrap text-xs" style={{ color: "var(--text-muted)" }}>
                    {fmt.format(a.createdAt)}
                  </td>
                  <td className="p-3 whitespace-nowrap text-xs" style={{ color: "var(--text-muted)" }}>
                    {a.claimedAt ? fmt.format(a.claimedAt) : "—"}
                  </td>
                  <td className="p-3 whitespace-nowrap text-xs" style={{ color: "var(--text-muted)" }}>
                    {a.completedAt ? fmt.format(a.completedAt) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
