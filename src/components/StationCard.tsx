import Link from "next/link";
import { IconChevronRight, IconGasStation } from "@tabler/icons-react";
import { cupetState } from "@/lib/cupet-state";
import { Pill } from "@/components/ui";

interface StationCardProps {
  id: number;
  name: string;
  establishment?: string;
  municipio?: string | null;
  provinceName?: string;
  disponibilidades: number;
  admiteSalaEspera: boolean;
  confirmed?: boolean;
  imageUrl?: string | null;
}

export default function StationCard({
  id,
  name,
  establishment,
  municipio,
  provinceName,
  disponibilidades,
  admiteSalaEspera,
  confirmed = true,
  imageUrl,
}: StationCardProps): React.JSX.Element {
  const { state, label } = cupetState({
    disponibilidades,
    admiteSalaEspera,
    confirmed,
  });

  return (
    <Link
      href={`/stations/${id}`}
      className="cw-card flex items-center gap-3 p-3.5 transition-colors hover:border-[color:var(--brand-border)]"
      style={{ borderColor: "var(--border-soft)" }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-11 w-11 shrink-0 rounded-[11px] object-cover"
          style={{ background: "var(--surface-2)" }}
        />
      ) : (
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] border"
          style={{
            background: "var(--brand-fill)",
            borderColor: "var(--brand-border)",
            color: "var(--brand)",
          }}
        >
          <IconGasStation size={18} stroke={1.75} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" style={{ color: "var(--text)" }}>
          {name}
        </p>
        <p className="truncate text-[11px]" style={{ color: "var(--text-muted-2)" }}>
          {[municipio, provinceName ?? establishment].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Pill state={state} label={label} dot={state !== "new"} />
        <IconChevronRight size={14} stroke={1.75} style={{ color: "var(--text-faint)" }} />
      </div>
    </Link>
  );
}
