"use client";

import { useEffect, useState } from "react";

export default function ScanIntervalPanel(): React.JSX.Element {
  const [interval, setInterval] = useState<number | null>(null);
  const [options, setOptions] = useState<number[]>([30, 60]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [forcing, setForcing] = useState(false);
  const [forceMsg, setForceMsg] = useState<string | null>(null);

  async function forceScan(): Promise<void> {
    setForcing(true);
    setForceMsg(null);
    try {
      const res = await fetch("/api/admin/force-scan", { method: "POST" });
      const data = (await res.json()) as { message?: string; error?: string };
      setForceMsg(data.message ?? data.error ?? `HTTP ${res.status}`);
    } catch (e) {
      setForceMsg(String(e));
    } finally {
      setForcing(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const data = (await res.json()) as { scanIntervalMinutes: number; options: number[] };
        setInterval(data.scanIntervalMinutes);
        if (data.options?.length) setOptions(data.options);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, []);

  async function save(minutes: number): Promise<void> {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanIntervalMinutes: minutes }),
      });
      const data = (await res.json()) as { scanIntervalMinutes?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setInterval(data.scanIntervalMinutes ?? minutes);
      setSaved(true);
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
          Intervalo de escaneo
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Cada cuánto el coordinador asigna un barrido del catálogo a un dispositivo.
        </p>
      </div>

      <div className="flex gap-2">
        {options.map((opt) => {
          const selected = interval === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={busy}
              onClick={() => void save(opt)}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{
                background: selected ? "var(--brand)" : "transparent",
                color: selected ? "#0f172a" : "var(--text)",
                border: `1px solid ${selected ? "var(--brand)" : "var(--border)"}`,
              }}
            >
              {opt} min
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--danger, #ef5a5a)" }}>
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="text-sm" style={{ color: "var(--brand)" }}>
          Guardado · ahora cada {interval} min.
        </p>
      )}

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
          Manda una orden SCAN por FCM a todos los dispositivos con token (los
          despierta aunque la app esté cerrada).
        </p>
        <button
          type="button"
          disabled={forcing}
          onClick={() => void forceScan()}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{ background: "transparent", color: "var(--brand)", border: "1.5px solid var(--brand)" }}
        >
          {forcing ? "Forzando…" : "Forzar barrido ahora"}
        </button>
        {forceMsg && (
          <p className="text-sm mt-2" style={{ color: "var(--text)" }}>
            {forceMsg}
          </p>
        )}
      </div>
    </section>
  );
}
