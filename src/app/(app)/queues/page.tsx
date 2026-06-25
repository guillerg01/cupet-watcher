import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createXutilClient } from "@/infra/xutil/client";
import { getUserXutilToken } from "@/infra/xutil/user-token";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";

export default async function QueuesPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const token = await getUserXutilToken(session.user.id);
  if (!token) {
    return (
      <EmptyState
        title="Sesión xutil expirada"
        description="Volvé a iniciar sesión con tu cuenta de ticket.xutil.net."
        action={
          <Link href="/login" className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--brand)", color: "#0f172a" }}>
            Ir a login
          </Link>
        }
      />
    );
  }

  const client = createXutilClient();
  let salas;
  try {
    salas = await client.getPosicionVisual(token);
  } catch {
    return (
      <EmptyState
        title="No se pudo cargar tus colas"
        description="Verificá tu conexión o volvé a iniciar sesión."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Mis colas en xutil
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Posición en tiempo real desde ticket.xutil.net
        </p>
      </div>

      {salas.length === 0 ? (
        <EmptyState
          title="Sin colas activas"
          description="No tenés turnos en sala de espera ahora mismo."
        />
      ) : (
        <div className="space-y-4">
          {salas.map((sala) => (
            <div
              key={sala.id_sala_espera}
              className="rounded-xl p-4 space-y-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div>
                <p className="font-semibold" style={{ color: "var(--text)" }}>
                  {sala.local_denominacion}
                </p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {sala.servicio_denominacion} · {sala.municipio}, {sala.provincia}
                </p>
              </div>
              {sala.turnos.map((t) => {
                const pct = t.total > 0 ? (t.posicion / t.total) * 100 : 0;
                return (
                  <div key={t.id_turno_servicio} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "var(--text)" }}>{t.denominacion}</span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {t.posicion} / {t.total}
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, pct)}%`, background: "var(--brand)" }}
                      />
                    </div>
                  </div>
                );
              })}
              <Link href={`/stations/${sala.id_local_servicio}`} className="text-xs" style={{ color: "var(--brand)" }}>
                Ver estación →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
