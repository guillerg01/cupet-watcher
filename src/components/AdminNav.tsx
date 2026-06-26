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
      className="flex flex-wrap gap-2 pb-4 mb-6"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {LINKS.map((l) => {
        const active = l.exact ? currentPath === l.href : currentPath.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: active ? "var(--brand)" : "var(--surface)",
              color: active ? "#0f172a" : "var(--text-muted)",
              border: active ? "none" : "1px solid var(--border)",
            }}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
