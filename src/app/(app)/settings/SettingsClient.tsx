"use client";

import { useActionState } from "react";
import Link from "next/link";
import ProvinceMultiSelect from "@/components/ProvinceMultiSelect";
import { saveProvincesAction } from "../onboarding/actions";
import { updateNotificationsAction, type SettingsResult } from "./actions";

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
    initResult,
  );

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
        Ajustes
      </h1>

      <section
        className="rounded-xl p-6 space-y-2"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Cuenta ticket.xutil.net
        </h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          <span className="font-medium" style={{ color: "var(--text)" }}>
            {user.name ?? user.email}
          </span>{" "}
          · {user.email}
        </p>
        {xutilLink && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Sesión xutil vinculada · token válido hasta{" "}
            {new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
              new Date(xutilLink.tokenExp),
            )}
          </p>
        )}
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Para renovar la sesión, cerrá sesión y volvé a entrar con tu cuenta de ticket.
        </p>
      </section>

      <section
        className="rounded-xl p-6 space-y-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Notificaciones por correo
        </h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Solo recibís emails de provincias que tengas suscritas abajo.
        </p>
        <form action={notifAction} className="space-y-3">
          {(
            [
              {
                name: "notifyNew",
                label: "Nuevo cupet detectado",
                hint: "Te avisa cuando aparece un cupet de combustible nuevo en tus provincias.",
                defaultChecked: user.notifyNew,
              },
              {
                name: "notifyAvailable",
                label: "Cupet con disponibilidad",
                hint: "Cuando un cupet vuelve a tener turnos disponibles.",
                defaultChecked: user.notifyAvailable,
              },
              {
                name: "notifyWaitroom",
                label: "Sala de espera habilitada",
                hint: "Cuando un cupet activa la sala de espera virtual.",
                defaultChecked: user.notifyWaitroom,
              },
            ] as const
          ).map((field) => (
            <label key={field.name} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name={field.name}
                defaultChecked={field.defaultChecked}
                className="mt-1 w-4 h-4 rounded accent-amber-400"
              />
              <span>
                <span className="text-sm block" style={{ color: "var(--text)" }}>
                  {field.label}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {field.hint}
                </span>
              </span>
            </label>
          ))}

          {notifState?.error && <p className="text-sm text-red-400">{notifState.error}</p>}
          {notifState?.success && (
            <p className="text-sm" style={{ color: "var(--brand)" }}>
              Preferencias guardadas
            </p>
          )}

          <button
            type="submit"
            disabled={notifPending}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: "var(--brand)", color: "#0f172a" }}
          >
            {notifPending ? "Guardando..." : "Guardar alertas"}
          </button>
        </form>
      </section>

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

      <p className="text-sm">
        <Link href="/dashboard" style={{ color: "var(--brand)" }}>
          Volver al panel
        </Link>
      </p>
    </div>
  );
}
