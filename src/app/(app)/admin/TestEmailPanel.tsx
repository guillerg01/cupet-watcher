"use client";

import { useEffect, useState } from "react";

export default function TestEmailPanel(): React.JSX.Element {
  const [arming, setArming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configIssue, setConfigIssue] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/test-email", { credentials: "same-origin" });
        const data = (await res.json()) as { issue?: string | null; configured?: boolean };
        if (data.issue) setConfigIssue(data.issue);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function send(): Promise<void> {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ confirm: true }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) setError(data.error ?? `HTTP ${res.status}`);
      else setMsg(data.message ?? "Enviado.");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
      setArming(false);
    }
  }

  return (
    <section
      className="rounded-xl p-5 space-y-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Correo de prueba a suscriptores
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Manda un correo de notificación de prueba a TODOS los usuarios con alertas de
          nuevos cupets activadas. Son correos reales · Resend free corta en 100/día.
        </p>
        {configIssue && (
          <p className="text-sm mt-2" style={{ color: "var(--danger, #ef5a5a)" }}>
            {configIssue}
          </p>
        )}
      </div>

      {!arming ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setArming(true);
            setMsg(null);
            setError(null);
          }}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{ background: "transparent", color: "var(--brand)", border: "1.5px solid var(--brand)" }}
        >
          Enviar correo de prueba…
        </button>
      ) : (
        <div
          className="rounded-lg p-3 space-y-3"
          style={{ background: "rgba(244,163,64,0.08)", border: "1px solid rgba(244,163,64,0.3)" }}
        >
          <p className="text-sm" style={{ color: "#F4A340" }}>
            ¿Seguro? Esto manda correos reales a todos los suscriptores ahora mismo.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void send()}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ background: "var(--brand)", color: "#0f172a", border: "none" }}
            >
              {busy ? "Enviando…" : "Sí, enviar ahora"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setArming(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {msg && (
        <p className="text-sm" style={{ color: "var(--brand)" }}>
          {msg}
        </p>
      )}
      {error && (
        <p className="text-sm" style={{ color: "var(--danger, #ef5a5a)" }}>
          {error}
        </p>
      )}
    </section>
  );
}
