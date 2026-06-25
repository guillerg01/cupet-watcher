import { requireAdmin } from "@/lib/admin";
import { repo, AuthAttempt } from "@/infra/db";

export const dynamic = "force-dynamic";

export default async function AdminLoginsPage(): Promise<React.JSX.Element> {
  await requireAdmin();

  const attemptRepo = await repo(AuthAttempt);
  const attempts = await attemptRepo.find({
    order: { createdAt: "DESC" },
    take: 300,
  });

  const fmt = new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Últimos {attempts.length} intentos
      </p>
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--surface)" }}>
            <tr>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Fecha</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Email</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Resultado</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Motivo</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>IP</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Agente</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a) => (
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
                      color: a.success ? "var(--brand)" : "#ef5a5a",
                    }}
                  >
                    {a.success ? "OK" : "Fallo"}
                  </span>
                </td>
                <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>
                  {a.reason ?? "—"}
                </td>
                <td className="p-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                  {a.ip ?? "—"}
                </td>
                <td className="p-3 text-xs max-w-[200px] truncate" style={{ color: "var(--text-muted)" }}>
                  {a.userAgent ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
