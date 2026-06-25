"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type ActionResult } from "@/lib/auth-actions";

const initialState: ActionResult = {};

export default function RegisterPage(): React.JSX.Element {
  const [state, action, pending] = useActionState(registerAction, initialState);

  return (
    <main className="min-h-dvh flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8 space-y-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
      >
        <div className="text-center">
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
            Crear cuenta
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Cuenta de Cupet Watcher para recibir alertas
          </p>
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
              Nombre <span style={{ color: "var(--text-muted)" }}>(opcional)</span>
            </label>
            <input
              type="text"
              name="name"
              autoComplete="name"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>

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
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
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
              minLength={6}
              autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>

          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-60"
            style={{ background: "var(--brand)", color: "#0f172a" }}
          >
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
