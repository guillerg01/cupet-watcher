interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

export default function StatCard({ label, value, sub, accent }: StatCardProps): React.JSX.Element {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{
        background: accent ? "var(--brand)" : "var(--surface)",
        border: accent ? "none" : "1px solid var(--border)",
        boxShadow: "var(--shadow)",
      }}
    >
      <span
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: accent ? "#92400e" : "var(--text-muted)" }}
      >
        {label}
      </span>
      <span
        className="text-3xl font-bold"
        style={{ color: accent ? "#0f172a" : "var(--text)" }}
      >
        {value}
      </span>
      {sub && (
        <span
          className="text-xs"
          style={{ color: accent ? "#78350f" : "var(--text-muted)" }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}
