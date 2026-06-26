import { requireAdmin } from "@/lib/admin";
import {
  repo,
  AppUser,
  AuthAttempt,
  Device,
  Notification,
  Station,
  DetectionEvent,
  UserRole,
} from "@/infra/db";
import StatCard from "@/components/StatCard";
import TestPushPanel from "./TestPushPanel";
import TestEmailPanel from "./TestEmailPanel";
import ScanIntervalPanel from "./ScanIntervalPanel";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage(): Promise<React.JSX.Element> {
  await requireAdmin();

  const [
    subscribers,
    admins,
    devices,
    stations,
    events,
    notifications,
    failedLogins,
    recentLogins,
  ] = await Promise.all([
    repo(AppUser).then((r) => r.count({ where: { role: UserRole.USER } })),
    repo(AppUser).then((r) => r.count({ where: { role: UserRole.ADMIN } })),
    repo(Device).then((r) => r.count()),
    repo(Station).then((r) => r.count({ where: { active: true } })),
    repo(DetectionEvent).then((r) => r.count()),
    repo(Notification).then((r) => r.count()),
    repo(AuthAttempt).then((r) => r.count({ where: { success: false } })),
    repo(AuthAttempt).then((r) =>
      r.find({ order: { createdAt: "DESC" }, take: 8 }),
    ),
  ]);

  const fmt = new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Suscriptores" value={subscribers} />
        <StatCard label="Dispositivos" value={devices} />
        <StatCard label="Estaciones activas" value={stations} />
        <StatCard label="Eventos detectados" value={events} accent={events > 0} />
        <StatCard label="Notificaciones" value={notifications} />
        <StatCard label="Logins fallidos" value={failedLogins} accent={failedLogins > 0} />
        <StatCard label="Admins" value={admins} />
      </div>

      <ScanIntervalPanel />

      <TestPushPanel />

      <TestEmailPanel />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
            Intentos de login recientes
          </h2>
          <Link href="/admin/logins" className="text-sm" style={{ color: "var(--brand)" }}>
            Ver todos
          </Link>
        </div>
        <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--surface)" }}>
              <tr>
                <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Fecha</th>
                <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Email</th>
                <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Resultado</th>
                <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {recentLogins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center" style={{ color: "var(--text-muted)" }}>
                    Sin intentos registrados
                  </td>
                </tr>
              ) : (
                recentLogins.map((a) => (
                  <tr key={a.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="p-3 whitespace-nowrap" style={{ color: "var(--text)" }}>
                      {fmt.format(a.createdAt)}
                    </td>
                    <td className="p-3" style={{ color: "var(--text)" }}>{a.email}</td>
                    <td className="p-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          background: a.success ? "rgba(31,214,166,0.15)" : "rgba(239,90,90,0.15)",
                          color: a.success ? "var(--brand)" : "var(--danger, #ef5a5a)",
                        }}
                      >
                        {a.success ? "OK" : a.reason ?? "fallido"}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {a.ip ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
