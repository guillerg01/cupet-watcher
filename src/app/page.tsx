import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-4xl font-bold" style={{ color: "var(--brand)" }}>
          Cupet Watcher
        </h1>
        <p className="text-lg" style={{ color: "var(--text-muted)" }}>
          Monitoreá cupets de combustible en Cuba. Datos públicos sin cuenta; alertas por email si entrás con tu cuenta de ticket.xutil.net.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/catalog"
            className="px-6 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{ background: "var(--brand)", color: "#0f172a" }}
          >
            Ver catálogo
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }}
          >
            Iniciar sesión
          </Link>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          <Link href="/analytics" style={{ color: "var(--brand)" }}>Analíticas</Link>
          {" · "}
          <Link href="/predict" style={{ color: "var(--brand)" }}>Mejor hora</Link>
        </p>
      </div>
    </main>
  );
}
