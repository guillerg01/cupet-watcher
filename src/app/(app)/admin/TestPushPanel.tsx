"use client";

import { useState } from "react";

interface PushResult {
  sent: number;
  failed: number;
  total: number;
  message: string;
  errors?: string[];
}

export default function TestPushPanel(): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onTestPush(): Promise<void> {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/test-push", { method: "POST" });
      const data = (await res.json()) as PushResult & { error?: string };
      if (!res.ok) {
        setError(data.message ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-xl p-5 space-y-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Notificaciones push (prueba)
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Envía una notificación de prueba a todos los dispositivos móviles con token registrado.
          Útil para verificar cómo se ven las alertas en el teléfono.
        </p>
      </div>

      <button
        type="button"
        onClick={onTestPush}
        disabled={busy}
        className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
        style={{ background: "var(--brand)", color: "#0f172a" }}
      >
        {busy ? "Enviando…" : "Notificar todos los dispositivos"}
      </button>

      {error && (
        <p className="text-sm" style={{ color: "var(--danger, #ef5a5a)" }}>
          {error}
        </p>
      )}

      {result && (
        <div
          className="text-sm rounded-lg p-3 space-y-1"
          style={{
            background: result.sent > 0 ? "rgba(31,214,166,0.1)" : "rgba(239,90,90,0.1)",
            color: "var(--text)",
          }}
        >
          <p>{result.message}</p>
          <p style={{ color: "var(--text-muted)" }}>
            Enviadas: {result.sent} · Fallidas: {result.failed} · Total tokens: {result.total}
          </p>
          {result.errors && result.errors.length > 0 && (
            <ul className="text-xs font-mono mt-2" style={{ color: "var(--text-muted)" }}>
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
