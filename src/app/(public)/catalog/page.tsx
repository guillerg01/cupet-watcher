import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import { listCupets, listProvinces } from "@/lib/cupet-catalog";

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; provinceId?: string }>;
}

const PER_PAGE = 30;

export default async function CatalogPage({ searchParams }: PageProps): Promise<React.JSX.Element> {
  const { page: pageRaw, q, provinceId: provinceRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);
  const provinceId =
    provinceRaw != null && provinceRaw !== "" ? Number(provinceRaw) : null;

  const [result, provinces] = await Promise.all([
    listCupets({
      q,
      provinceId: provinceId != null && !Number.isNaN(provinceId) ? provinceId : null,
      page,
      perPage: PER_PAGE,
    }),
    listProvinces(),
  ]);

  const { stations, total, lastPage } = result;

  const qs = (p: number): string => {
    const parts = [`page=${p}`];
    if (q?.trim()) parts.push(`q=${encodeURIComponent(q.trim())}`);
    if (provinceId != null && !Number.isNaN(provinceId)) {
      parts.push(`provinceId=${provinceId}`);
    }
    return parts.join("&");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Catálogo de cupets
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {total} estaciones de combustible sincronizadas desde ticket.xutil.net
        </p>
      </div>

      <form className="space-y-3">
        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre o municipio..."
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--brand)", color: "#0f172a" }}
          >
            Buscar
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={q?.trim() ? `/catalog?q=${encodeURIComponent(q.trim())}` : "/catalog"}
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: provinceId == null ? "var(--brand)" : "var(--surface-2)",
              color: provinceId == null ? "#0f172a" : "var(--text-muted)",
            }}
          >
            Todas
          </Link>
          {provinces.map((p) => {
            const active = provinceId === p.id;
            const href = `/catalog?provinceId=${p.id}${q?.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`;
            return (
              <Link
                key={p.id}
                href={href}
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
      </form>

      {stations.length === 0 ? (
        <EmptyState
          title="Sin datos todavía"
          description="El worker debe completar al menos un barrido del catálogo."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {stations.map((s) => (
            <Link
              key={s.id}
              href={`/stations/${s.id}`}
              className="block p-4 rounded-xl transition-all"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex gap-3">
                {s.imageUrl && (
                  <img
                    src={s.imageUrl}
                    alt=""
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                    style={{ border: "1px solid var(--border)" }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>
                      {s.name}
                    </p>
                    <span
                      className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: s.disponibilidades > 0 ? "var(--brand)" : "var(--surface-2)",
                        color: s.disponibilidades > 0 ? "#0f172a" : "var(--text-muted)",
                      }}
                    >
                      {s.disponibilidades > 0 ? s.disponibilidades : "—"}
                    </span>
                  </div>
                  <p className="text-xs truncate mt-1" style={{ color: "var(--text-muted)" }}>
                    {s.establishment} · {s.provinceName}
                    {s.municipio ? ` · ${s.municipio}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {s.views != null && (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {s.views.toLocaleString("es")} visitas
                      </span>
                    )}
                    {s.rating != null && (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {s.rating.toFixed(1)} / 5
                      </span>
                    )}
                    {!s.confirmed && (
                      <span className="text-xs font-semibold" style={{ color: "var(--brand)" }}>
                        Nuevo
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/catalog?${qs(page - 1)}`} className="text-sm" style={{ color: "var(--brand)" }}>
              Anterior
            </Link>
          )}
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            {page} / {lastPage}
          </span>
          {page < lastPage && (
            <Link href={`/catalog?${qs(page + 1)}`} className="text-sm" style={{ color: "var(--brand)" }}>
              Siguiente
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
