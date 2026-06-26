import type { CupetState } from "@/lib/cupet-state";
import { STATE_STYLE } from "@/lib/cupet-state";

export function Pill({
  state,
  label,
  dot = true,
}: {
  state: CupetState;
  label: string;
  dot?: boolean;
}): React.JSX.Element {
  const s = STATE_STYLE[state];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold"
      style={{ background: s.fill, borderColor: s.border, color: s.color }}
    >
      {dot && state !== "new" && (
        <span className="inline-block h-1 w-1 rounded-full" style={{ background: s.color }} />
      )}
      {label}
    </span>
  );
}

export function ProvinceChip({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}): React.JSX.Element {
  return (
    <a
      href={href}
      className="shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors"
      style={{
        background: active ? "var(--brand-fill)" : "var(--surface)",
        borderColor: active ? "var(--brand-border)" : "var(--border)",
        color: active ? "var(--brand)" : "var(--text-muted)",
      }}
    >
      {label}
    </a>
  );
}

export function PageHeader({
  title,
  subtitle,
  live,
  count,
}: {
  title: string;
  subtitle?: string;
  live?: boolean;
  count?: number | string;
}): React.JSX.Element {
  return (
    <div className="border-b pb-4" style={{ borderColor: "var(--border-soft)" }}>
      <div className="flex items-center gap-2">
        {live && (
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--brand)" }}
          />
        )}
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          {title}
        </h1>
        {count != null && (
          <span
            className="cw-mono rounded-md border px-2 py-0.5 text-[10px] font-semibold"
            style={{
              background: "var(--brand-fill)",
              borderColor: "var(--brand-border)",
              color: "var(--brand)",
            }}
          >
            {count}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
