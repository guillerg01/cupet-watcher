import Link from "next/link";
import { getCupetStats } from "@/lib/cupet-stats";
import { listProvinces } from "@/lib/cupet-catalog";
import { db } from "@/infra/db";

interface PageProps {
  searchParams: Promise<{ provinceId?: string }>;
}

interface QueueStat {
  stationid: number;
  stationname: string;
  avgfill: number;
}

export default async function AnalyticsPage({ searchParams }: PageProps): Promise<React.JSX.Element> {
  const { provinceId: provinceRaw } = await searchParams;
  const provinceId =
    provinceRaw != null && provinceRaw !== "" ? Number(provinceRaw) : null;
  const filterId = provinceId != null && !Number.isNaN(provinceId) ? provinceId : null;

  const [stats, provinces, dataSource] = await Promise.all([
    getCupetStats(filterId),
    listProvinces(),
    db(),
  ]);

  const [queueStats, detectionTrend] = await Promise.all([
    dataSource.query<QueueStat[]>(
      `
      SELECT
        ss."stationId" AS stationid,
        st.name AS stationname,
        AVG(CASE WHEN ss."queueTotal" > 0 THEN ss."queuePosicion"::float / ss."queueTotal" ELSE NULL END) AS avgfill
      FROM "StationSnapshot" ss
      JOIN "Station" st ON st.id = ss."stationId"
      WHERE ss.ts > NOW() - INTERVAL '7 days'
        AND ss."queueTotal" > 0
        ${filterId != null ? `AND st."provinceId" = ${filterId}` : ""}
      GROUP BY ss."stationId", st.name
      HAVING COUNT(*) >= 5
      ORDER BY avgfill ASC
      LIMIT 10
      `,
    ),
    dataSource.query<{ day: string; count: string }[]>(
      `
      SELECT DATE_TRUNC('day', "detectedAt") AS day, COUNT(*)::bigint AS count
      FROM "DetectionEvent"
      WHERE "detectedAt" > NOW() - INTERVAL '14 days'
      ${filterId != null ? `AND "provinceId" = ${filterId}` : ""}
      GROUP BY 1
      ORDER BY 1 ASC
      `,
    ),
  ]);

  const maxProv = Math.max(1, ...stats.byProvince.map((p) => p.total));
  const maxEvents = Math.max(1, ...detectionTrend.map((d) => Number(d.count)));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Analíticas
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Mismos datos que la app móvil — catálogo sincronizado en tiempo real
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/analytics"
          className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            background: filterId == null ? "var(--brand)" : "var(--surface-2)",
            color: filterId == null ? "#0f172a" : "var(--text-muted)",
          }}
        >
          Todas
        </Link>
        {provinces.map((p) => {
          const active = filterId === p.id;
          return (
            <Link
              key={p.id}
              href={`/analytics?provinceId=${p.id}`}
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: active ? "var(--brand)" : "var(--surface-2)",
                color: active ? "#0f172a" : "var(--text-muted)",
              }}
            >
              {p.name}
            </Link>
          );
        })}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Activos" value={stats.totalActive} />
        <StatCard label="Con cupo" value={stats.withAvailability} accent />
        <StatCard label="Sin cupo" value={stats.withoutAvailability} />
        <StatCard label="Nuevos (7d)" value={stats.recentNew} accent />
        <StatCard label="Visitas totales" value={stats.totalViews} />
        <StatCard label="Workers online" value={stats.onlineWorkers} />
        {filterId != null && (
          <StatCard label="Dispositivos vigilando" value={stats.devicesWatching} />
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text)" }}>
          Por provincia
        </h2>
        <div className="space-y-2">
          {stats.byProvince.map((p) => {
            const pct = (p.total / maxProv) * 100;
            return (
              <div key={p.provinceId} className="flex items-center gap-3">
                <span
                  className="w-32 text-xs text-right shrink-0 truncate"
                  style={{ color: "var(--text-muted)" }}
                >
                  {p.provinceName}
                </span>
                <div
                  className="flex-1 rounded-full overflow-hidden h-5"
                  style={{ background: "var(--surface-2)" }}
                >
                  <div
                    className="h-full rounded-full flex items-center px-2 transition-all"
                    style={{ width: `${Math.max(pct, 4)}%`, background: "var(--brand)" }}
                  >
                    <span className="text-xs font-bold" style={{ color: "#0f172a" }}>
                      {p.available}/{p.total}
                    </span>
                  </div>
                </div>
                <span className="text-xs w-16 text-right shrink-0" style={{ color: "var(--text-muted)" }}>
                  {p.views.toLocaleString("es")} v.
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {queueStats.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text)" }}>
            Cola promedio (últimos 7 días)
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Ratio posición/total — menor es mejor
          </p>
          <div className="space-y-2">
            {queueStats.map((s) => {
              const pct = Math.min(100, s.avgfill * 100);
              const hue = Math.round((1 - s.avgfill) * 120);
              return (
                <div key={s.stationid} className="flex items-center gap-3">
                  <span
                    className="w-40 text-xs text-right shrink-0 truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {s.stationname}
                  </span>
                  <div
                    className="flex-1 rounded-full overflow-hidden h-4"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        background: `hsl(${hue}, 70%, 45%)`,
                      }}
                    />
                  </div>
                  <span className="text-xs w-10 text-right" style={{ color: "var(--text-muted)" }}>
                    {(s.avgfill * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {detectionTrend.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text)" }}>
            Detecciones (últimos 14 días)
          </h2>
          <div className="flex items-end gap-1 h-32">
            {detectionTrend.map((d) => {
              const h = (Number(d.count) / maxEvents) * 100;
              const date = new Date(d.day);
              return (
                <div
                  key={d.day}
                  className="flex flex-col items-center gap-1 flex-1"
                  title={`${date.toLocaleDateString("es")}: ${d.count}`}
                >
                  <div className="w-full flex items-end justify-center" style={{ height: "100px" }}>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(h, 4)}%`,
                        background: "var(--brand)",
                      }}
                    />
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {date.getDate()}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}): React.JSX.Element {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: accent ? "var(--brand)" : "var(--surface)",
        border: accent ? "none" : "1px solid var(--border)",
      }}
    >
      <p className="text-xs font-semibold" style={{ color: accent ? "#0f172a" : "var(--text-muted)" }}>
        {label}
      </p>
      <p
        className="text-2xl font-black mt-1"
        style={{ color: accent ? "#0f172a" : "var(--text)" }}
      >
        {value.toLocaleString("es")}
      </p>
    </div>
  );
}
