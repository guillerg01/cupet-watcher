interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon = "🔍",
  title,
  description,
  action,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="font-semibold text-base mb-1" style={{ color: "var(--text)" }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm max-w-xs" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
