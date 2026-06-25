import { repo, Station } from "@/infra/db";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

const PER_PAGE = 30;

export default async function CatalogPage({ searchParams }: PageProps): Promise<React.JSX.Element> {
  const { page: pageRaw, q } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);
  const stationRepo = await repo(Station);

  const qb = stationRepo
    .createQueryBuilder("s")
    .leftJoinAndSelect("s.province", "province")
    .where("s.active = true")
    .orderBy("s.disponibilidades", "DESC")
    .addOrderBy("s.name", "ASC");

  if (q?.trim()) {
    qb.andWhere(
      "(LOWER(s.name) LIKE :q OR LOWER(s.establishment) LIKE :q OR LOWER(s.municipio) LIKE :q)",
      { q: `%${q.trim().toLowerCase()}%` },
    );
  }

  const [stations, total] = await qb
    .skip((page - 1) * PER_PAGE)
    .take(PER_PAGE)
    .getManyAndCount();

  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Catálogo de cupets
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Datos reales del último barrido de ticket.xutil.net ({total} estaciones de combustible).
        </p>
      </div>

      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre o municipio..."
          className="flex-1 px-3 py-2 rounded-lg text-sm"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "var(--brand)", color: "#0f172a" }}
        >
          Buscar
        </button>
      </form>

      {stations.length === 0 ? (
        <EmptyState
          title="Sin datos todavía"
          description="El worker debe completar al menos un barrido del catálogo. Revisá que el worker esté corriendo."
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
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>
                    {s.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {s.establishment} · {s.province.name}
                  </p>
                </div>
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
            </Link>
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/catalog?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="text-sm" style={{ color: "var(--brand)" }}>
              Anterior
            </Link>
          )}
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            {page} / {lastPage}
          </span>
          {page < lastPage && (
            <Link href={`/catalog?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="text-sm" style={{ color: "var(--brand)" }}>
              Siguiente
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
