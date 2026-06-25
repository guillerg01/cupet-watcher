import { db } from "@/infra/db";

interface ProvinceCount {
  provinceid: number;
  name: string;
  total: string;
}

interface QueueStat {
  stationid: number;
  stationname: string;
  avgfill: number;
}

export default async function AnalyticsPage(): Promise<React.JSX.Element> {
  const dataSource = await db();

  const [stationsByProvince, queueStats, detectionTrend] = await Promise.all([
    dataSource.query<ProvinceCount[]>(
      `
      SELECT p.id AS provinceid, p.name, COUNT(s.id)::bigint AS total
      FROM "Province" p
      LEFT JOIN "Station" s ON s."provinceId" = p.id AND s.active = true
      GROUP BY p.id, p.name
      ORDER BY total DESC
      `,
    ),
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
      GROUP BY 1
      ORDER BY 1 ASC
      `,
    ),
  ]);

  const maxStations = Math.max(1, ...stationsByProvince.map((p) => Number(p.total)));
  const maxEvents = Math.max(1, ...detectionTrend.map((d) => Number(d.count)));

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
        Analíticas
      </h1>

      <section>
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text)" }}>
          Estaciones por provincia
        </h2>
        <div className="space-y-2">
          {stationsByProvince.map((p) => {
            const pct = (Number(p.total) / maxStations) * 100;
            return (
              <div key={p.provinceid} className="flex items-center gap-3">
                <span className="w-32 text-xs text-right shrink-0 truncate" style={{ color: "var(--text-muted)" }}>
                  {p.name}
                </span>
                <div className="flex-1 rounded-full overflow-hidden h-5" style={{ background: "var(--surface-2)" }}>
                  <div
                    className="h-full rounded-full flex items-center px-2 transition-all"
                    style={{ width: `${Math.max(pct, 4)}%`, background: "var(--brand)" }}
                  >
                    <span className="text-xs font-bold" style={{ color: "#0f172a" }}>
                      {Number(p.total)}
                    </span>
                  </div>
                </div>
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
            Ratio posición/total — menor es mejor (menos cola)
          </p>
          <div className="space-y-2">
            {queueStats.map((s) => {
              const pct = Math.min(100, s.avgfill * 100);
              const hue = Math.round((1 - s.avgfill) * 120);
              return (
                <div key={s.stationid} className="flex items-center gap-3">
                  <span className="w-40 text-xs text-right shrink-0 truncate" style={{ color: "var(--text-muted)" }}>
                    {s.stationname}
                  </span>
                  <div className="flex-1 rounded-full overflow-hidden h-4" style={{ background: "var(--surface-2)" }}>
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
