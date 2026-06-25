import Link from "next/link";
import { signOut } from "@/auth";

const NAV_LINKS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/queues", label: "Mis colas" },
  { href: "/catalog", label: "Catálogo" },
  { href: "/analytics", label: "Analíticas" },
  { href: "/predict", label: "Mejor hora" },
  { href: "/settings", label: "Ajustes" },
];

export default function AppNav(): React.JSX.Element {
  return (
    <nav
      className="w-full px-4 py-3 flex items-center justify-between"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <Link href="/dashboard" className="font-bold text-lg" style={{ color: "var(--brand)" }}>
        Cupet Watcher
      </Link>

      <div className="flex items-center gap-1 overflow-x-auto">
        {NAV_LINKS.map((l) => (
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
