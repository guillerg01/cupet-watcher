import Link from "next/link";
import {
  IconChartBar,
  IconClock,
  IconGasStation,
  IconLayoutDashboard,
} from "@tabler/icons-react";
import { auth } from "@/auth";

const LINKS = [
  { href: "/catalog", label: "Catálogo", icon: IconGasStation },
  { href: "/analytics", label: "Analíticas", icon: IconChartBar },
  { href: "/predict", label: "Mejor hora", icon: IconClock },
];

export default async function PublicNav(): Promise<React.JSX.Element> {
  const session = await auth();

  return (
    <nav
      className="sticky top-0 z-40 w-full px-4 py-3"
      style={{ background: "var(--nav-bg)", borderBottom: "1px solid var(--border-soft)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg" style={{ color: "var(--brand)" }}>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--brand)", color: "var(--brand-dark)" }}
          >
            <IconGasStation size={18} stroke={2} />
          </span>
          Cupet Watcher
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap"
              style={{ color: "var(--text-muted)" }}
            >
              <l.icon size={16} stroke={1.75} />
              {l.label}
            </Link>
          ))}
          {session ? (
            <Link
              href="/dashboard"
              className="cw-btn-primary ml-1 flex items-center gap-1.5 px-3 py-1.5 text-sm"
            >
              <IconLayoutDashboard size={16} stroke={1.75} />
              Mi panel
            </Link>
          ) : (
            <Link href="/login" className="cw-btn-primary ml-1 px-3 py-1.5 text-sm">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
