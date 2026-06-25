import Link from "next/link";
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
      className="w-full px-4 py-3 flex items-center justify-between"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <Link href={admin ? "/admin" : "/dashboard"} className="font-bold text-lg" style={{ color: "var(--brand)" }}>
        Cupet Watcher
      </Link>

      <div className="flex items-center gap-1 overflow-x-auto">
        {admin && (
          <Link
            href="/admin"
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--brand)", color: "#0f172a" }}
          >
            Admin
          </Link>
        )}

        {!admin &&
          NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
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
            className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Salir
          </button>
        </form>
      </div>
    </nav>
  );
}
