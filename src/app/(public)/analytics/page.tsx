import StatCard from "@/components/StatCard";
import { PageHeader, ProvinceChip } from "@/components/ui";
import { getCupetStats } from "@/lib/cupet-stats";
import { listProvinces } from "@/lib/cupet-catalog";

interface PageProps {
  searchParams: Promise<{ provinceId?: string }>;
}

export default async function AnalyticsPage({ searchParams }: PageProps): Promise<React.JSX.Element> {
  const { provinceId: provinceRaw } = await searchParams;
  const provinceId =
    provinceRaw != null && provinceRaw !== "" ? Number(provinceRaw) : null;
  const filterId = provinceId != null && !Number.isNaN(provinceId) ? provinceId : null;

  const [stats, provinces] = await Promise.all([
    getCupetStats(filterId),
    listProvinces(),
  ]);

  const maxProv = Math.max(1, ...stats.byProvince.map((p) => p.total));
  const maxEvents = Math.max(1, ...stats.detectionTrend.map((d) => d.count));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analíticas"
        subtitle="Mismos datos que la app móvil — catálogo sincronizado en tiempo real"
      />

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <ProvinceChip label="Todas" active={filterId == null} href="/analytics" />
        {provinces.map((p) => (
          <ProvinceChip
            key={p.id}
            label={p.name}
            active={filterId === p.id}
            href={`/analytics?provinceId=${p.id}`}
          />
        ))}
      </div>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3">
        <StatCard label="Estaciones" value={stats.totalActive} />
        <StatCard label="Disponibles" value={stats.withAvailability} accent border="var(--brand-border)" />
        <StatCard label="Nuevos en listado (7d)" value={stats.recentNew} border="var(--accent-border)" />
        <StatCard label="Visitas" value={stats.totalViews} />
        <StatCard label="Workers" value={stats.onlineWorkers} />
        <StatCard label="Sin cupo" value={stats.withoutAvailability} />
      </section>

      <section className="cw-card p-4">
        <p className="cw-section-label mb-3">Eventos por provincia</p>
        <div className="space-y-2">
          {stats.byProvince.map((p) => {
            const pct = (p.available / maxProv) * 100;
            return (
              <div key={p.provinceId} className="flex items-center gap-3">
                <span
                  className="w-28 shrink-0 truncate text-right text-xs"
                  style={{ color: "var(--text-muted-2)" }}
                >
                  {p.provinceName}
                </span>
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full"
                  style={{ background: "var(--surface-2)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(pct, 4)}%`,
                      background: "var(--brand)",
                    }}
                  />
                </div>
                <span className="cw-mono w-14 shrink-0 text-right text-xs" style={{ color: "var(--text-muted)" }}>
                  {p.available}/{p.total}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {stats.queueStats.length > 0 && (
        <section className="cw-card p-4">
          <p className="cw-section-label mb-1">Cola promedio · 7 días</p>
          <p className="mb-3 text-xs" style={{ color: "var(--text-muted-2)" }}>
            Menor porcentaje = menos cola
          </p>
          <div className="space-y-2">
            {stats.queueStats.map((s) => {
              const pct = Math.min(100, s.avgFill * 100);
              const hue = Math.round((1 - s.avgFill) * 120);
              return (
                <div key={s.stationId} className="flex items-center gap-3">
                  <span
                    className="w-36 shrink-0 truncate text-right text-xs"
                    style={{ color: "var(--text-muted-2)" }}
                  >
                    {s.stationName}
                  </span>
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full"
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
                  <span className="w-10 text-right text-xs" style={{ color: "var(--text-muted)" }}>
                    {(s.avgFill * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {stats.detectionTrend.length > 0 && (
        <section className="cw-card p-4">
          <p className="cw-section-label mb-4">Tendencia de detecciones · 14 días</p>
          <div className="flex h-32 items-end gap-1">
            {stats.detectionTrend.map((d) => {
              const h = (d.count / maxEvents) * 100;
              const date = new Date(d.day);
              return (
                <div
                  key={d.day}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${date.toLocaleDateString("es")}: ${d.count}`}
                >
                  <div className="flex h-[100px] w-full items-end justify-center">
                    <div
                      className="w-full max-w-[24px] rounded-t-md"
                      style={{
                        height: `${Math.max(h, 4)}%`,
                        background: "var(--brand)",
                      }}
                    />
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-muted-2)" }}>
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
