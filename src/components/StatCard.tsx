interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  border?: string;
}

export default function StatCard({
  label,
  value,
  sub,
  accent,
  border,
}: StatCardProps): React.JSX.Element {
  const text = typeof value === "number" ? value.toLocaleString("es") : value;
  return (
    <div
      className="cw-card flex min-w-0 flex-col gap-1 p-4"
      style={border ? { borderColor: border } : undefined}
    >
      <span
        className="cw-mono truncate text-xl font-bold"
        style={{ color: accent ? "var(--brand)" : "var(--text)" }}
      >
        {text}
      </span>
      <span className="text-[10px]" style={{ color: "var(--text-muted-2)" }}>
        {label}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}
