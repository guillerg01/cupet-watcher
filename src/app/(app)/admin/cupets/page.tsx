import { requireAdmin } from "@/lib/admin";
import { db } from "@/infra/db";
import StatCard from "@/components/StatCard";

export const dynamic = "force-dynamic";

interface CupetRow {
  id: number;
  name: string;
  establishment: string;
  provinceName: string | null;
  municipio: string | null;
  disponibilidades: number;
  active: boolean;
  confirmed: boolean;
  lastSeenAt: string | null;
}

export default async function AdminCupetsPage(): Promise<React.JSX.Element> {
  await requireAdmin();
  const ds = await db();

  const rows = (await ds.query(`
    SELECT s.id, s.name, s.establishment, p.name AS "provinceName", s.municipio,
           s.disponibilidades, s.active, s.confirmed, s."lastSeenAt"
    FROM "Station" s
    LEFT JOIN "Province" p ON p.id = s."provinceId"
    ORDER BY s.active DESC, s.disponibilidades DESC, s."lastSeenAt" DESC NULLS LAST
    LIMIT 500
  `)) as CupetRow[];

  const [counts] = (await ds.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE active)::int AS active,
      COUNT(*) FILTER (WHERE disponibilidades > 0 AND active)::int AS available,
      COUNT(*) FILTER (WHERE NOT confirmed)::int AS unconfirmed
    FROM "Station"
  `)) as Array<{ total: number; active: number; available: number; unconfirmed: number }>;

  const fmt = new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" });

  function dispColor(n: number, active: boolean): string {
    if (!active) return "#526175";
    return n > 0 ? "#1FD6A6" : "#E05252";
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total cupets" value={counts?.total ?? 0} />
        <StatCard label="Activos" value={counts?.active ?? 0} />
        <StatCard label="Con disponibilidad" value={counts?.available ?? 0} accent={(counts?.available ?? 0) > 0} />
        <StatCard label="Sin confirmar" value={counts?.unconfirmed ?? 0} />
      </div>

      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Mostrando {rows.length} cupets (máx 500) · ordenados por activos y disponibilidad
      </p>

      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--surface)" }}>
            <tr>
              {["Cupet", "Provincia", "Municipio", "Disp.", "Estado", "Visto"].map((h) => (
                <th key={h} className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center" style={{ color: "var(--text-muted)" }}>
                  Sin cupets · esperá el primer barrido
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td className="p-3" style={{ color: "var(--text)" }}>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.establishment}</div>
                  </td>
                  <td className="p-3" style={{ color: "var(--text-muted)" }}>{s.provinceName ?? "—"}</td>
                  <td className="p-3" style={{ color: "var(--text-muted)" }}>{s.municipio ?? "—"}</td>
                  <td className="p-3 font-mono font-semibold" style={{ color: dispColor(s.disponibilidades, s.active) }}>
                    {s.disponibilidades}
                  </td>
                  <td className="p-3">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{
                        background: s.active ? "rgba(31,214,166,0.12)" : "rgba(139,156,180,0.12)",
                        color: s.active ? "#1FD6A6" : "#8B9CB4",
                      }}
                    >
                      {s.active ? "activo" : "inactivo"}
                    </span>
                    {!s.confirmed && (
                      <span className="ml-1 text-xs" style={{ color: "#F4A340" }}>nuevo</span>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap text-xs" style={{ color: "var(--text-muted)" }}>
                    {s.lastSeenAt ? fmt.format(new Date(s.lastSeenAt)) : "—"}
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
