import { notFound } from "next/navigation";
import Link from "next/link";
import { getCupetDetail } from "@/lib/cupet-detail";
import { cupetState } from "@/lib/cupet-state";
import { Pill, PageHeader } from "@/components/ui";
interface Params {
  params: Promise<{ id: string }>;
}

export default async function StationDetailPage({ params }: Params): Promise<React.JSX.Element> {
  const { id } = await params;
  const stationId = parseInt(id, 10);
  if (isNaN(stationId)) notFound();

  const cupet = await getCupetDetail(stationId);
  if (!cupet) notFound();

  const mapsUrl =
    cupet.lat != null && cupet.lng != null
      ? `https://www.google.com/maps?q=${cupet.lat},${cupet.lng}`
      : null;

  const { state, label } = cupetState({
    disponibilidades: cupet.disponibilidades,
    admiteSalaEspera: cupet.admiteSalaEspera,
    confirmed: cupet.confirmed ?? true,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">      {!cupet.live && (
        <p
          className="text-sm rounded-lg px-3 py-2"
          style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
        >
          No se pudo actualizar desde xutil. Mostrando último dato guardado.
        </p>
      )}

      <div>
        {cupet.imageUrl && (
          <img
            src={cupet.imageUrl}
            alt={cupet.name}
            className="w-full h-48 object-cover rounded-xl mb-4"
            style={{ border: "1px solid var(--border)" }}
          />
        )}

      <PageHeader title={cupet.name} subtitle={[cupet.establishment, cupet.municipio, cupet.provinceName].filter(Boolean).join(" · ")} />

      <div className="flex flex-wrap items-center gap-2">
        <Pill state={state} label={label} dot={state !== "new"} />          {cupet.admiteSalaEspera && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "var(--surface-2)", color: "var(--brand)" }}
            >
              Sala de espera
            </span>
          )}
          {cupet.tieneValidacion && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              Requiere validación
            </span>
          )}
          {cupet.views != null && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              {cupet.views.toLocaleString("es")} visitas
            </span>
          )}
          {cupet.rating != null && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              {cupet.rating.toFixed(1)} / 5
            </span>
          )}
          {cupet.live && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "var(--surface-2)", color: "var(--brand)" }}
            >
              Actualizado ahora
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {cupet.publicLink && (
            <a
              href={cupet.publicLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--brand)", color: "#0f172a" }}
            >
              Ver en xutil
            </a>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--surface-2)", color: "var(--text)" }}
            >
              Abrir mapa
            </a>
          )}
        </div>
      </div>

      {cupet.detail?.datos_adicionales && cupet.detail.datos_adicionales.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
            Datos requeridos para reservar
          </h2>
          <ul className="space-y-2">
            {cupet.detail.datos_adicionales.map((field) => (
              <li
                key={field.name}
                className="text-sm px-3 py-2 rounded-lg"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <span className="font-medium" style={{ color: "var(--text)" }}>
                  {field.label}
                </span>
                {field.required && (
                  <span className="ml-2 text-xs" style={{ color: "var(--brand)" }}>
                    obligatorio
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {cupet.detail?.valoraciones && cupet.detail.valoraciones.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
            Opiniones recientes
          </h2>
          <div className="space-y-3">
            {cupet.detail.valoraciones.slice(0, 5).map((review) => (
              <article
                key={review.id}
                className="p-3 rounded-xl text-sm"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="flex justify-between gap-2 mb-1">
                  <span className="font-medium" style={{ color: "var(--text)" }}>
                    {review.usuario}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    {review.valoracion}/5 · {review.date}
                  </span>
                </div>
                <p style={{ color: "var(--text-muted)" }}>{review.mensaje}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
          Historial reciente
        </h2>
        {cupet.snapshots.length > 0 ? (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
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
                {cupet.snapshots.map((snap, i) => (
                  <tr
                    key={i}
                    style={{
                      background: "var(--surface)",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <td className="px-4 py-2" style={{ color: "var(--text-muted)" }}>
                      {new Intl.DateTimeFormat("es", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(snap.ts))}
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
        <Link href="/catalog" className="text-sm" style={{ color: "var(--brand)" }}>
          Volver al catálogo
        </Link>
      </div>
    </div>
  );
}
