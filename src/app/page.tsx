import Link from "next/link";
import { IconChartBar, IconClock, IconGasStation, IconLogin } from "@tabler/icons-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--brand)" }}>
          <IconGasStation size={32} stroke={1.75} style={{ color: "var(--brand-dark)" }} />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            Cupet Watcher
          </h1>
          <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Monitoreá cupets de combustible en Cuba. Datos públicos sin cuenta; alertas por email si
            entrás con tu cuenta.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
          <Link href="/catalog" className="cw-btn-primary inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm">
            <IconGasStation size={18} stroke={1.75} />
            Ver catálogo
          </Link>
          <Link
            href="/login"
            className="cw-btn-outline inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            <IconLogin size={18} stroke={1.75} />
            Iniciar sesión
          </Link>
        </div>
        <p className="flex items-center justify-center gap-4 text-sm" style={{ color: "var(--text-muted-2)" }}>
          <Link href="/analytics" className="inline-flex items-center gap-1" style={{ color: "var(--brand)" }}>
            <IconChartBar size={15} stroke={1.75} />
            Analíticas
          </Link>
          <Link href="/predict" className="inline-flex items-center gap-1" style={{ color: "var(--brand)" }}>
            <IconClock size={15} stroke={1.75} />
            Mejor hora
          </Link>
        </p>
      </div>
    </main>
  );
}
