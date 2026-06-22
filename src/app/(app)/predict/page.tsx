import { prisma } from "@/infra/db/prisma";
import Heatmap from "@/components/Heatmap";
import EmptyState from "@/components/EmptyState";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface PageProps {
  searchParams: Promise<{ province?: string }>;
}

export default async function PredictPage({ searchParams }: PageProps): Promise<React.JSX.Element> {
  const { province } = await searchParams;

  const provinces = await prisma.province.findMany({ orderBy: { name: "asc" } });

  const selectedId = province ? parseInt(province, 10) : provinces[0]?.id;
  const selected = provinces.find((p) => p.id === selectedId);

  const scope = selectedId ? `province:${selectedId}` : null;

  const predictions = scope
    ? await prisma.predictionCache.findMany({
        where: { scope },
        orderBy: [{ dow: "asc" }, { hour: "asc" }],
      })
    : [];

  const top3 = [...predictions].sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Mejor hora para coger gasolina
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Basado en histórico de disponibilidad y cola.
        </p>
      </div>

      {/* Province selector */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
          Provincia
        </label>
        <div className="flex flex-wrap gap-2">
          {provinces.map((p) => (
            <a
              key={p.id}
              href={`/predict?province=${p.id}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: p.id === selectedId ? "var(--brand)" : "var(--surface-2)",
                color: p.id === selectedId ? "#0f172a" : "var(--text-muted)",
                border: `1px solid ${p.id === selectedId ? "var(--brand-dark)" : "var(--border)"}`,
              }}
            >
              {p.name}
            </a>
          ))}
        </div>
      </div>

      {selected && predictions.length > 0 ? (
        <>
          {/* Top 3 */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
              Mejores ventanas — {selected.name}
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {top3.map((p, i) => (
                <div
                  key={`${p.dow}-${p.hour}`}
                  className="rounded-xl p-4 text-center"
                  style={{
                    background: i === 0 ? "var(--brand)" : "var(--surface)",
                    border: `1px solid ${i === 0 ? "var(--brand-dark)" : "var(--border)"}`,
                  }}
                >
                  <div
                    className="text-2xl font-bold"
                    style={{ color: i === 0 ? "#0f172a" : "var(--text)" }}
                  >
                    {String(p.hour).padStart(2, "0")}:00
                  </div>
                  <div
                    className="text-sm mt-0.5"
                    style={{ color: i === 0 ? "#78350f" : "var(--text-muted)" }}
                  >
                    {DAYS[p.dow]}
                  </div>
                  <div
                    className="text-xs mt-1 font-medium"
                    style={{ color: i === 0 ? "#92400e" : "var(--text-muted)" }}
                  >
                    Score: {p.score.toFixed(2)} · {p.samples} muestras
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Heatmap */}
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
              Mapa de calor semanal
            </h2>
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <Heatmap
                data={predictions.map((p) => ({
                  dow: p.dow,
                  hour: p.hour,
                  score: p.score,
                }))}
                topN={3}
              />
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          icon="📊"
          title="Sin datos de predicción"
          description={
            selected
              ? `No hay suficiente histórico para ${selected.name} todavía. Revisá más tarde.`
              : "Seleccioná una provincia para ver la predicción."
          }
        />
      )}
    </div>
  );
}
