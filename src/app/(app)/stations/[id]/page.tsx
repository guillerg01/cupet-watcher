import { prisma } from "@/infra/db/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Params {
  params: Promise<{ id: string }>;
}

export default async function StationDetailPage({ params }: Params): Promise<React.JSX.Element> {
  const { id } = await params;
  const stationId = parseInt(id, 10);
  if (isNaN(stationId)) notFound();

  const station = await prisma.station.findUnique({
    where: { id: stationId },
    include: {
      province: true,
      snapshots: {
        orderBy: { ts: "desc" },
        take: 20,
      },
    },
  });

  if (!station) notFound();

  const latestSnap = station.snapshots[0] ?? null;
  const disponibilidades = latestSnap?.disponibilidades ?? 0;

  const xutilUrl = `https://ticket.xutil.net/store/service-detail?service=${station.id}`;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {station.name}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {station.establishment}
              {station.municipio ? ` · ${station.municipio}` : ""} ·{" "}
              {station.province.name}
            </p>
          </div>
          <span
            className="shrink-0 px-3 py-1 rounded-full text-sm font-bold"
            style={{
              background: disponibilidades > 0 ? "var(--brand)" : "var(--surface-2)",
              color: disponibilidades > 0 ? "#0f172a" : "var(--text-muted)",
            }}
          >
            {disponibilidades > 0
              ? `${disponibilidades} disponible${disponibilidades !== 1 ? "s" : ""}`
              : "Sin disponibilidad"}
          </span>
        </div>

        {/* Info chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {station.admiteSalaEspera && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "var(--surface-2)", color: "var(--brand)" }}
            >
              Sala de espera
            </span>
          )}
          {station.tieneValidacion && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              Requiere validación
            </span>
          )}
          {station.lat && station.lng && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              📍 {station.lat.toFixed(4)}, {station.lng.toFixed(4)}
            </span>
          )}
        </div>

        <div className="mt-4">
          <a
            href={xutilUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "var(--brand)", color: "#0f172a" }}
          >
            Ver en xutil →
          </a>
        </div>
      </div>

      {/* Snapshots */}
      <section>
        <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
          Historial reciente
        </h2>
        {station.snapshots.length > 0 ? (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  <th className="px-4 py-2 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                    Fecha
                  </th>
                  <th className="px-4 py-2 text-center font-medium" style={{ color: "var(--text-muted)" }}>
                    Disp.
                  </th>
                  <th className="px-4 py-2 text-center font-medium" style={{ color: "var(--text-muted)" }}>
                    Cola
                  </th>
                  <th className="px-4 py-2 text-center font-medium" style={{ color: "var(--text-muted)" }}>
                    Visitas
                  </th>
                </tr>
              </thead>
              <tbody>
                {station.snapshots.map((snap) => (
                  <tr
                    key={snap.id.toString()}
                    style={{
                      background: "var(--surface)",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <td className="px-4 py-2" style={{ color: "var(--text-muted)" }}>
                      {new Intl.DateTimeFormat("es", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(snap.ts)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span
                        style={{
                          color: snap.disponibilidades > 0 ? "var(--brand)" : "var(--text-muted)",
                          fontWeight: snap.disponibilidades > 0 ? 600 : 400,
                        }}
                      >
                        {snap.disponibilidades}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center" style={{ color: "var(--text-muted)" }}>
                      {snap.queuePosicion != null && snap.queueTotal != null
                        ? `${snap.queuePosicion}/${snap.queueTotal}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-center" style={{ color: "var(--text-muted)" }}>
                      {snap.views ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Sin historial disponible todavía.
          </p>
        )}
      </section>

      <div>
        <Link href="/dashboard" className="text-sm" style={{ color: "var(--brand)" }}>
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}
