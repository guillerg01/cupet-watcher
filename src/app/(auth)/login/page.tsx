"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

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
    <main className="min-h-dvh flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8 space-y-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
      >
        <div className="text-center">
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
            Iniciar sesión
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Entrá con tu cuenta de Cupet Watcher
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-60"
            style={{ background: "var(--brand)", color: "#0f172a" }}
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
