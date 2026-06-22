import Link from "next/link";

interface StationCardProps {
  id: number;
  name: string;
  establishment: string;
  municipio?: string | null;
  disponibilidades: number;
  admiteSalaEspera: boolean;
}

export default function StationCard({
  id,
  name,
  establishment,
  municipio,
  disponibilidades,
  admiteSalaEspera,
}: StationCardProps): React.JSX.Element {
  const available = disponibilidades > 0;

  return (
    <Link
      href={`/stations/${id}`}
      className="block rounded-xl p-4 transition-all hover:scale-[1.01]"
      style={{
        background: "var(--surface)",
        border: `1px solid ${available ? "var(--brand)" : "var(--border)"}`,
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>
            {name}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {establishment}
            {municipio ? ` · ${municipio}` : ""}
          </p>
        </div>
        <span
          className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: available ? "var(--brand)" : "var(--surface-2)",
            color: available ? "#0f172a" : "var(--text-muted)",
          }}
        >
          {available ? `${disponibilidades} disp.` : "Sin disp."}
        </span>
      </div>
      {admiteSalaEspera && (
        <p className="mt-2 text-xs" style={{ color: "var(--brand)" }}>
          ✓ Sala de espera
        </p>
      )}
    </Link>
  );
}
