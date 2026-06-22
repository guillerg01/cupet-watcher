"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import ProvinceMultiSelect from "@/components/ProvinceMultiSelect";
import { saveProvincesAction } from "../onboarding/actions";
import {
  updateNotificationsAction,
  saveXutilLinkAction,
  type SettingsResult,
} from "./actions";

interface UserPrefs {
  notifyNew: boolean;
  notifyAvailable: boolean;
  notifyWaitroom: boolean;
  email: string;
  name: string | null;
}

interface Province {
  id: number;
  name: string;
}

interface XutilLink {
  xutilUsername: string;
  tokenExp: Date;
}

interface SettingsClientProps {
  user: UserPrefs;
  userProvinceIds: number[];
  allProvinces: Province[];
  xutilLink?: XutilLink;
}

const initResult: SettingsResult = {};

export default function SettingsClient({
  user,
  userProvinceIds,
  allProvinces,
  xutilLink,
}: SettingsClientProps): React.JSX.Element {
  const [notifState, notifAction, notifPending] = useActionState(
    updateNotificationsAction,
    initResult
  );
  const [xutilState, xutilAction, xutilPending] = useActionState(
    saveXutilLinkAction,
    initResult
  );

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
        Ajustes
      </h1>

      {/* Account info */}
      <section
        className="rounded-xl p-6 space-y-2"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Cuenta
        </h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          <span className="font-medium" style={{ color: "var(--text)" }}>{user.name ?? "—"}</span>{" "}
          · {user.email}
        </p>
      </section>

      {/* Notification prefs */}
      <section
        className="rounded-xl p-6 space-y-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Notificaciones
        </h2>
        <form action={notifAction} className="space-y-3">
          {(
            [
              { name: "notifyNew", label: "Nuevo cupet detectado", defaultChecked: user.notifyNew },
              { name: "notifyAvailable", label: "Cupet disponible", defaultChecked: user.notifyAvailable },
              { name: "notifyWaitroom", label: "Sala de espera habilitada", defaultChecked: user.notifyWaitroom },
            ] as const
          ).map((field) => (
            <label key={field.name} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name={field.name}
                defaultChecked={field.defaultChecked}
                className="w-4 h-4 rounded accent-amber-400"
              />
              <span className="text-sm" style={{ color: "var(--text)" }}>
                {field.label}
              </span>
            </label>
          ))}

          {notifState?.error && (
            <p className="text-sm text-red-400">{notifState.error}</p>
          )}
          {notifState?.success && (
            <p className="text-sm text-green-400">Preferencias guardadas</p>
          )}

          <button
            type="submit"
            disabled={notifPending}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: "var(--brand)", color: "#0f172a" }}
          >
            {notifPending ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </section>

      {/* Province subscriptions */}
      <section
        className="rounded-xl p-6 space-y-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Provincias suscritas
        </h2>
        <form action={saveProvincesAction} className="space-y-4">
          <ProvinceMultiSelect
            provinces={allProvinces}
            selected={userProvinceIds}
            name="provinceIds"
          />
          <button
            type="submit"
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: "var(--brand)", color: "#0f172a" }}
          >
            Actualizar provincias
          </button>
        </form>
      </section>

      {/* xutil token */}
      <section
        className="rounded-xl p-6 space-y-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Token de xutil
        </h2>
        {xutilLink && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Vinculado como <span style={{ color: "var(--brand)" }}>{xutilLink.xutilUsername}</span>
            {" · "}
            expira{" "}
            {new Intl.DateTimeFormat("es", { dateStyle: "short" }).format(
              new Date(xutilLink.tokenExp)
            )}
          </p>
        )}
        <form action={xutilAction} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
              Usuario xutil
            </label>
            <input
              type="text"
              name="xutilUsername"
              defaultValue={xutilLink?.xutilUsername ?? ""}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
              Token de acceso
            </label>
            <input
              type="password"
              name="xutilToken"
              placeholder="Pegá tu token aquí"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
              Expiración del token
            </label>
            <input
              type="datetime-local"
              name="tokenExp"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>

          {xutilState?.error && (
            <p className="text-sm text-red-400">{xutilState.error}</p>
          )}
          {xutilState?.success && (
            <p className="text-sm text-green-400">Token guardado</p>
          )}

          <button
            type="submit"
            disabled={xutilPending}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: "var(--brand)", color: "#0f172a" }}
          >
            {xutilPending ? "Guardando..." : "Guardar token"}
          </button>
        </form>
      </section>
    </div>
  );
}
