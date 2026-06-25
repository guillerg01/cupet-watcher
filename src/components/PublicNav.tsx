import Link from "next/link";
import { auth } from "@/auth";

const LINKS = [
  { href: "/catalog", label: "Catálogo" },
  { href: "/analytics", label: "Analíticas" },
  { href: "/predict", label: "Mejor hora" },
];

export default async function PublicNav(): Promise<React.JSX.Element> {
  const session = await auth();

  return (
    <nav
      className="w-full px-4 py-3 flex items-center justify-between"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <Link href="/" className="font-bold text-lg" style={{ color: "var(--brand)" }}>
        Cupet Watcher
      </Link>
      <div className="flex items-center gap-2 overflow-x-auto">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            {l.label}
          </Link>
        ))}
        {session ? (
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: "var(--brand)", color: "#0f172a" }}
          >
            Mi panel
          </Link>
        ) : (
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: "var(--brand)", color: "#0f172a" }}
          >
            Entrar
          </Link>
        )}
      </div>
    </nav>
  );
}
