"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Resumen", exact: true },
  { href: "/admin/cupets", label: "Cupets" },
  { href: "/admin/scans", label: "Escaneos" },
  { href: "/admin/devices", label: "Dispositivos" },
  { href: "/admin/subscribers", label: "Suscriptores" },
  { href: "/admin/notifications", label: "Notificaciones" },
  { href: "/admin/logins", label: "Intentos de login" },
];

export default function AdminNav(): React.JSX.Element {
  const currentPath = usePathname();

  return (
    <div
      className="mb-6 flex flex-wrap gap-2 border-b pb-4"
      style={{ borderColor: "var(--border-soft)" }}
    >
      {LINKS.map((l) => {
        const active = l.exact ? currentPath === l.href : currentPath.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: active ? "var(--brand-fill)" : "var(--surface)",
              color: active ? "var(--brand)" : "var(--text-muted)",
              border: `1px solid ${active ? "var(--brand-border)" : "var(--border-soft)"}`,
            }}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
