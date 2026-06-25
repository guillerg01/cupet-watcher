import { repo, Station } from "@/infra/db";
import { refreshStationFromXutil } from "@/core/station/sync-detail";
import type { ServicioDetail } from "@/infra/xutil/types";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Params {
  params: Promise<{ id: string }>;
}

function detailFromCache(cache: Record<string, unknown> | null): ServicioDetail | null {
  if (!cache || typeof cache.id !== "number") return null;
  return cache as unknown as ServicioDetail;
}

function averageRating(slice: ServicioDetail["reviews_slice"]): number | null {
  if (!slice) return null;
  const total =
    slice["5_stars"] +
    slice["4_stars"] +
    slice["3_stars"] +
    slice["2_stars"] +
    slice["1_stars"];
  if (total === 0) return null;
  const score =
    slice["5_stars"] * 5 +
    slice["4_stars"] * 4 +
    slice["3_stars"] * 3 +
    slice["2_stars"] * 2 +
    slice["1_stars"];
  return score / total;
}

export default async function StationDetailPage({ params }: Params): Promise<React.JSX.Element> {
  const { id } = await params;
  const stationId = parseInt(id, 10);
  if (isNaN(stationId)) notFound();

  const stationRepo = await repo(Station);
  let station = await stationRepo.findOne({
    where: { id: stationId },
    relations: { province: true, snapshots: true },
  });

  let detail: ServicioDetail | null = station ? detailFromCache(station.detailCache) : null;
  let live = false;
  let stale = false;

  try {
    const refreshed = await refreshStationFromXutil(stationId);
    station = refreshed.station;
    detail = refreshed.detail;
    live = true;
  } catch {
    if (!station) notFound();
    stale = true;
    detail = detail ?? detailFromCache(station.detailCache);
  }

  if (!station) notFound();

  const snapshots = [...station.snapshots]
    .sort((a, b) => b.ts.getTime() - a.ts.getTime())
    .slice(0, 20);
  const latestSnap = snapshots[0] ?? null;
  const disponibilidades = detail?.disponibilidades ?? latestSnap?.disponibilidades ?? station.disponibilidades;
  const disponible = detail?.disponible ?? latestSnap?.disponible ?? disponibilidades > 0;
  const views = detail?.views ?? latestSnap?.views ?? null;
  const rating = averageRating(detail?.reviews_slice);
  const imageUrl = detail?.image_urls?.[0] ?? null;
  const xutilUrl =
    detail?.public_link ?? `https://ticket.xutil.net/store/service-detail?service=${station.id}`;
  const mapsUrl =
    station.lat != null && station.lng != null
      ? `https://www.google.com/maps?q=${station.lat},${station.lng}`
      : null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {stale && (
        <p className="text-sm rounded-lg px-3 py-2" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
          No se pudo actualizar desde xutil. Mostrando último dato guardado
          {station.detailFetchedAt
            ? ` (${new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" }).format(station.detailFetchedAt)})`
            : ""}
          .
        </p>
      )}

      <div>
        {imageUrl && (
          <img
            src={imageUrl}
            alt={station.name}
            className="w-full h-48 object-cover rounded-xl mb-4"
            style={{ border: "1px solid var(--border)" }}
          />
        )}

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {detail?.nombre ?? station.name}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {detail?.establecimiento ?? station.establishment}
              {(detail?.municipio ?? station.municipio)
                ? ` · ${detail?.municipio ?? station.municipio}`
                : ""}{" "}
              · {station.province.name}
            </p>
            {detail?.nombre_entidad && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {detail.nombre_entidad}
              </p>
            )}
          </div>
          <span
            className="shrink-0 px-3 py-1 rounded-full text-sm font-bold"
            style={{
              background: disponible ? "var(--brand)" : "var(--surface-2)",
              color: disponible ? "#0f172a" : "var(--text-muted)",
            }}
          >
            {disponible
              ? `${disponibilidades} disponible${disponibilidades !== 1 ? "s" : ""}`
              : "Sin disponibilidad"}
          </span>
        </div>

        {detail?.descripcion && (
          <p className="text-sm mt-3" style={{ color: "var(--text)" }}>
            {detail.descripcion}
          </p>
        )}

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
          {views != null && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              {views.toLocaleString("es")} visitas
            </span>
          )}
          {rating != null && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              {rating.toFixed(1)} / 5
            </span>
          )}
          {live && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "var(--surface-2)", color: "var(--brand)" }}
            >
              Actualizado ahora
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <a
            href={xutilUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--brand)", color: "#0f172a" }}
          >
            Ver en xutil
          </a>
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

      {detail?.datos_adicionales && detail.datos_adicionales.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
            Datos requeridos para reservar
          </h2>
          <ul className="space-y-2">
            {detail.datos_adicionales.map((field) => (
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

      {detail?.valoraciones && detail.valoraciones.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
            Opiniones recientes
          </h2>
          <div className="space-y-3">
            {detail.valoraciones.slice(0, 5).map((review) => (
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
        {snapshots.length > 0 ? (
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
                {snapshots.map((snap) => (
                  <tr
                    key={snap.id}
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
        <Link href="/catalog" className="text-sm" style={{ color: "var(--brand)" }}>
          Volver al catálogo
        </Link>
      </div>
    </div>
  );
}
