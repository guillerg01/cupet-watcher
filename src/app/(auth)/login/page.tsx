"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { IconGasStation, IconLock, IconMail } from "@tabler/icons-react";

export default function LoginPage(): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string; redirectTo?: string };

      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar sesión");
        setPending(false);
        return;
      }

      window.location.href = data.redirectTo ?? "/dashboard";
    } catch {
      setError("Error de red. Probá de nuevo.");
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "var(--brand)" }}
          >
            <IconGasStation size={28} stroke={1.75} style={{ color: "var(--brand-dark)" }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Entrá con tu cuenta de Cupet Watcher
          </p>
        </div>

        <form onSubmit={onSubmit} className="cw-card space-y-3 p-5">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              <IconMail size={14} stroke={1.75} />
              Email
            </span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="cw-input w-full px-3 py-2.5 text-sm outline-none focus:border-[color:var(--brand-border)]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              <IconLock size={14} stroke={1.75} />
              Contraseña
            </span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="cw-input w-full px-3 py-2.5 text-sm outline-none focus:border-[color:var(--brand-border)]"
            />
          </label>

          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="cw-btn-primary w-full py-3 text-sm disabled:opacity-60"
          >
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
          ¿No tenés cuenta?{" "}
          <Link href="/register" style={{ color: "var(--brand)" }}>
            Crear una
          </Link>
        </p>
      </div>
    </main>
  );
}
