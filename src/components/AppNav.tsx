import Link from "next/link";
import { IconGasStation, IconLogout, IconShield } from "@tabler/icons-react";
import { auth, signOut } from "@/auth";
import { isAdminRole } from "@/lib/admin";

const NAV_LINKS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/queues", label: "Mis colas" },
  { href: "/catalog", label: "Catálogo" },
  { href: "/analytics", label: "Analíticas" },
  { href: "/predict", label: "Mejor hora" },
  { href: "/settings", label: "Ajustes" },
];

export default async function AppNav(): Promise<React.JSX.Element> {
  const session = await auth();
  const admin = isAdminRole(session?.user?.role);

  return (
    <nav
      className="sticky top-0 z-40 w-full px-4 py-3"
      style={{ background: "var(--nav-bg)", borderBottom: "1px solid var(--border-soft)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Link
          href={admin ? "/admin" : "/dashboard"}
          className="flex items-center gap-2 font-bold text-lg"
          style={{ color: "var(--brand)" }}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--brand)", color: "var(--brand-dark)" }}
          >
            <IconGasStation size={18} stroke={2} />
          </span>
          Cupet Watcher
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto">
          {admin && (
            <Link
              href="/admin"
              className="cw-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm"
            >
              <IconShield size={16} stroke={1.75} />
              Admin
            </Link>
          )}

          {!admin &&
            NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors hover:bg-white/5"
                style={{ color: "var(--text-muted)" }}
              >
                {l.label}
              </Link>
            ))}

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="ml-1 flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium"
              style={{ color: "var(--text-muted-2)" }}
            >
              <IconLogout size={16} stroke={1.75} />
              Salir
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
