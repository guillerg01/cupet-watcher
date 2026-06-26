import Link from "next/link";
import { IconGasStation, IconSearch } from "@tabler/icons-react";
import EmptyState from "@/components/EmptyState";
import StationCard from "@/components/StationCard";
import { PageHeader, ProvinceChip } from "@/components/ui";
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

  const qs = (p: number, prov?: number | null): string => {
    const parts = [`page=${p}`];
    if (q?.trim()) parts.push(`q=${encodeURIComponent(q.trim())}`);
    const pid = prov === undefined ? provinceId : prov;
    if (pid != null && !Number.isNaN(pid)) parts.push(`provinceId=${pid}`);
    return parts.join("&");
  };

  const allHref = q?.trim() ? `/catalog?q=${encodeURIComponent(q.trim())}` : "/catalog";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cupets"
        live
        count={total}
        subtitle="Estaciones de combustible sincronizadas desde ticket.xutil.net"
      />

      <form className="space-y-3">
        <div
          className="flex items-center gap-2 rounded-xl border px-3.5 py-2.5"
          style={{ background: "var(--surface)", borderColor: "var(--border-soft)" }}
        >
          <IconSearch size={16} stroke={1.75} style={{ color: "var(--text-faint)" }} />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre o municipio..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text)" }}
          />
          <button type="submit" className="cw-btn-primary px-4 py-2 text-xs">
            Buscar
          </button>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <ProvinceChip label="Todas" active={provinceId == null} href={allHref} />
          {provinces.map((p) => {
            const active = provinceId === p.id;
            const href = `/catalog?provinceId=${p.id}${q?.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`;
            return (
              <ProvinceChip key={p.id} label={p.name} active={active} href={href} />
            );
          })}
        </div>
      </form>

      {stations.length === 0 ? (
        <EmptyState
          icon={IconGasStation}
          title="Sin datos todavía"
          description="El worker debe completar al menos un barrido del catálogo."
        />
      ) : (
        <div className="grid gap-2">
          {stations.map((s) => (
            <StationCard
              key={s.id}
              id={s.id}
              name={s.name}
              establishment={s.establishment}
              municipio={s.municipio}
              provinceName={s.provinceName}
              disponibilidades={s.disponibilidades}
              admiteSalaEspera={s.admiteSalaEspera}
              confirmed={s.confirmed}
              imageUrl={s.imageUrl}
            />
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex justify-center items-center gap-4 py-2">
          {page > 1 && (
            <Link href={`/catalog?${qs(page - 1)}`} className="text-sm font-semibold" style={{ color: "var(--brand)" }}>
              Anterior
            </Link>
          )}
          <span className="cw-mono text-xs" style={{ color: "var(--text-muted-2)" }}>
            {page}/{lastPage}
          </span>
          {page < lastPage && (
            <Link href={`/catalog?${qs(page + 1)}`} className="text-sm font-semibold" style={{ color: "var(--brand)" }}>
              Siguiente
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
