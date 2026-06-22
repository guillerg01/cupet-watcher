import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-5xl mb-2">⛽</div>
        <h1 className="text-4xl font-bold" style={{ color: "var(--brand)" }}>
          Cupet Watcher
        </h1>
        <p className="text-lg" style={{ color: "var(--text-muted)" }}>
          Monitoreá gasolineras en Cuba. Recibí notificaciones cuando hay disponibilidad en tu provincia.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/register"
            className="px-6 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{ background: "var(--brand)", color: "#0f172a" }}
          >
            Crear cuenta
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
