import { requireAdmin } from "@/lib/admin";
import { repo, Notification } from "@/infra/db";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage(): Promise<React.JSX.Element> {
  await requireAdmin();

  const notificationRepo = await repo(Notification);
  const rows = await notificationRepo.find({
    order: { createdAt: "DESC" },
    take: 200,
    relations: { user: true, event: { station: true } },
  });

  const fmt = new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Últimas {rows.length} notificaciones
      </p>
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--surface)" }}>
            <tr>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Fecha</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Usuario</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Estación</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Canal</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center" style={{ color: "var(--text-muted)" }}>
                  Sin notificaciones
                </td>
              </tr>
            ) : (
              rows.map((n) => (
                <tr key={n.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td className="p-3 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {fmt.format(n.createdAt)}
                  </td>
                  <td className="p-3" style={{ color: "var(--text)" }}>{n.user?.email ?? n.userId}</td>
                  <td className="p-3" style={{ color: "var(--text)" }}>
                    {n.event?.station?.name ?? "—"}
                  </td>
                  <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{n.channel}</td>
                  <td className="p-3">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        background:
                          n.status === "SENT"
                            ? "rgba(31,214,166,0.15)"
                            : n.status === "FAILED"
                              ? "rgba(239,90,90,0.15)"
                              : "var(--surface)",
                        color:
                          n.status === "SENT"
                            ? "var(--brand)"
                            : n.status === "FAILED"
                              ? "#ef5a5a"
                              : "var(--text-muted)",
                      }}
                    >
                      {n.status}
                    </span>
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
