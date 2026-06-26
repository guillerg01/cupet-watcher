"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { IconGasStation, IconLock, IconMail, IconUser } from "@tabler/icons-react";

export default function RegisterPage(): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const reg = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, email, password }),
      });

      if (reg.status === 409) {
        setError("Ese email ya está registrado");
        setPending(false);
        return;
      }
      if (!reg.ok) {
        setError("No se pudo crear la cuenta");
        setPending(false);
        return;
      }

      const login = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await login.json()) as { error?: string; redirectTo?: string };

      if (!login.ok) {
        setError(data.error ?? "Cuenta creada, pero falló el inicio de sesión");
        setPending(false);
        return;
      }

      window.location.href = data.redirectTo ?? "/onboarding";
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
            Crear cuenta
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Cuenta de Cupet Watcher para recibir alertas
          </p>
        </div>

        <form onSubmit={onSubmit} className="cw-card space-y-3 p-5">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              <IconUser size={14} stroke={1.75} />
              Nombre (opcional)
            </span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              className="cw-input w-full px-3 py-2.5 text-sm outline-none"
            />
          </label>

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
              className="cw-input w-full px-3 py-2.5 text-sm outline-none"
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
              minLength={6}
              autoComplete="new-password"
              className="cw-input w-full px-3 py-2.5 text-sm outline-none"
            />
          </label>

          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

          <button type="submit" disabled={pending} className="cw-btn-primary w-full py-3 text-sm disabled:opacity-60">
            {pending ? "Creando..." : "Crear cuenta"}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" style={{ color: "var(--brand)" }}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
