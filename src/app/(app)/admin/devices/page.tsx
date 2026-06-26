import { requireAdmin } from "@/lib/admin";
import { repo, Device } from "@/infra/db";

export const dynamic = "force-dynamic";

export default async function AdminDevicesPage(): Promise<React.JSX.Element> {
  await requireAdmin();

  const deviceRepo = await repo(Device);
  const devices = await deviceRepo.find({
    order: { lastHeartbeatAt: "DESC", createdAt: "DESC" },
    take: 200,
  });

  const fmt = new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Workers móviles que reportan cupets ({devices.length})
      </p>
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--surface)" }}>
            <tr>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Usuario ticket</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Plataforma</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Ticket</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Push</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Último heartbeat</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Registro</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center" style={{ color: "var(--text-muted)" }}>
                  Sin dispositivos registrados
                </td>
              </tr>
            ) : (
              devices.map((d) => (
                <tr key={d.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td className="p-3 font-mono text-xs" style={{ color: "var(--text)" }}>
                    {d.xutilUsername}
                  </td>
                  <td className="p-3" style={{ color: "var(--text-muted)" }}>{d.platform}</td>
                  <td className="p-3" style={{ color: "var(--text)" }}>
                    {d.ticketLinked ? "vinculado" : "pendiente"}
                  </td>
                  <td className="p-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                    {d.pushToken ? "si" : "no"}
                  </td>
                  <td className="p-3 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {d.lastHeartbeatAt ? fmt.format(d.lastHeartbeatAt) : "—"}
                  </td>
                  <td className="p-3 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {fmt.format(d.createdAt)}
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
