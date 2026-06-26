import type { TablerIcon } from "@tabler/icons-react";

interface EmptyStateProps {
  icon?: TablerIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      {Icon && (
        <div
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border-soft)",
            color: "var(--text-muted)",
          }}
        >
          <Icon size={28} stroke={1.5} />
        </div>
      )}
      <h3 className="mb-1 text-base font-semibold" style={{ color: "var(--text)" }}>
        {title}
      </h3>
      {description && (
        <p className="max-w-xs text-sm" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
