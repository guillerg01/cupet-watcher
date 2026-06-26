import { requireAdmin } from "@/lib/admin";
import { db } from "@/infra/db";
import { getDetectionCounts, DETECTION_WINDOW_MS } from "@/lib/detection-stats";
import { NEW_VIEWS_THRESHOLD } from "@/lib/cupet-catalog";
import StatCard from "@/components/StatCard";

export const dynamic = "force-dynamic";

interface CupetRow {
  id: number;
  name: string;
  establishment: string;
  provinceName: string | null;
  municipio: string | null;
  disponibilidades: number;
  views: number | null;
  active: boolean;
  confirmed: boolean;
  listChange: "NEW" | "REAPPEARED" | null;
  isNew: boolean;
  lastSeenAt: string | null;
}

export default async function AdminCupetsPage(): Promise<React.JSX.Element> {
  await requireAdmin();
  const ds = await db();
  const detection = await getDetectionCounts();
  const weekAgo = new Date(Date.now() - DETECTION_WINDOW_MS);

  // "Nuevo" = última detección NEW/REAPPEARED en la ventana, O menos de
  // NEW_VIEWS_THRESHOLD vistas (cupet recién publicado, casi sin tráfico).
  const newExpr = `(lc.type IS NOT NULL OR COALESCE(ss.views, NULLIF(s."detailCache"->>'views','')::int) < ${NEW_VIEWS_THRESHOLD})`;
  const rows = (await ds.query(
    `
    SELECT s.id, s.name, s.establishment, p.name AS "provinceName", s.municipio,
           s.disponibilidades, s.active, s.confirmed, s."lastSeenAt",
           COALESCE(ss.views, NULLIF(s."detailCache"->>'views','')::int) AS views,
           lc.type AS "listChange",
           ${newExpr} AS "isNew"
    FROM "Station" s
    LEFT JOIN "Province" p ON p.id = s."provinceId"
    LEFT JOIN LATERAL (
      SELECT views FROM "StationSnapshot" WHERE "stationId" = s.id ORDER BY ts DESC LIMIT 1
    ) ss ON true
    LEFT JOIN LATERAL (
      SELECT e.type FROM "DetectionEvent" e
      WHERE e."stationId" = s.id AND e.type IN ('NEW', 'REAPPEARED') AND e."detectedAt" > $1
      ORDER BY e."detectedAt" DESC LIMIT 1
    ) lc ON true
    ORDER BY ${newExpr} DESC, s.active DESC, s.disponibilidades DESC, s."lastSeenAt" DESC NULLS LAST
    LIMIT 500
  `,
    [weekAgo],
  )) as CupetRow[];

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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="Nuevos en listado (7d)"
          value={detection.newStations7d}
          accent={detection.newStations7d > 0}
        />
        <StatCard
          label="Cambios catálogo (7d)"
          value={detection.listChangeStations7d}
        />
        <StatCard
          label="Eventos NEW (7d)"
          value={detection.newEvents7d}
        />
      </div>

      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        <strong style={{ color: "var(--text)" }}>Sin confirmar</strong> = vistos en barrido parcial, no son
        descubrimientos. <strong style={{ color: "var(--text)" }}>Nuevos en listado</strong> = detecciones NEW
        distintas (7 días). El último barrido puede decir &quot;sin cambios&quot; aunque acá haya eventos viejos.
      </p>

      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Mostrando {rows.length} cupets (máx 500) · nuevos primero, luego activos y disponibilidad
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
                    <div className="flex items-center gap-2">
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                      {s.isNew && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            background: "rgba(244,163,64,0.15)",
                            color: "#F4A340",
                            border: "1px solid rgba(244,163,64,0.4)",
                          }}
                        >
                          NUEVO
                        </span>
                      )}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {s.establishment}
                      {s.views != null && ` · ${s.views.toLocaleString("es")} vistas`}
                    </div>
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
                      <span className="ml-1 text-xs" style={{ color: "#8B9CB4" }}>parcial</span>
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
