import Link from "next/link";
import { IconBell, IconMapPin, IconGasStation } from "@tabler/icons-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { In } from "typeorm";
import { db, repo, UserProvince, DetectionEvent, Station } from "@/infra/db";
import StatCard from "@/components/StatCard";
import StationCard from "@/components/StationCard";
import EmptyState from "@/components/EmptyState";

interface StationWithLatest {
  id: number;
  name: string;
  establishment: string;
  municipio: string | null;
  admiteSalaEspera: boolean;
  disponibilidades: number;
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const userProvinceRepo = await repo(UserProvince);
  const userProvinces = await userProvinceRepo.find({
    where: { userId },
    select: { provinceId: true },
  });

  const provinceIds = userProvinces.map((up) => up.provinceId);

  if (provinceIds.length === 0) {
    return (
      <EmptyState
        icon={IconMapPin}
        title="No tenés provincias configuradas"
        description="Seleccioná las provincias en las que tenés cuenta de xutil para ver cupets disponibles."
        action={
          <Link
            href="/onboarding"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "var(--brand)", color: "#0f172a" }}
          >
            Configurar provincias
          </Link>
        }
      />
    );
  }

  const dataSource = await db();
  const [availableStations, recentEvents, totalStations] = await Promise.all([
    dataSource.query<StationWithLatest[]>(
      `
      SELECT DISTINCT ON (s.id)
        s.id,
        s.name,
        s.establishment,
        s.municipio,
        s."admiteSalaEspera",
        snap."disponibilidades"
      FROM "Station" s
      JOIN "StationSnapshot" snap ON snap."stationId" = s.id
      WHERE s."provinceId" = ANY($1::int[])
        AND s.active = true
        AND snap."disponibilidades" > 0
      ORDER BY s.id, snap.ts DESC
      `,
      [provinceIds],
    ),
    (async () => {
      const eventRepo = await repo(DetectionEvent);
      return eventRepo.find({
        where: { provinceId: In(provinceIds) },
        order: { detectedAt: "DESC" },
        take: 10,
        relations: { station: true, province: true },
      });
    })(),
    (async () => {
      const stationRepo = await repo(Station);
      return stationRepo.count({
        where: { provinceId: In(provinceIds), active: true },
      });
    })(),
  ]);

  const availCount = availableStations.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Hola, {session.user.name ?? "usuario"}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {provinceIds.length} provincia{provinceIds.length !== 1 ? "s" : ""} monitoreada{provinceIds.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCard label="Disponibles ahora" value={availCount} accent={availCount > 0} />
        <StatCard label="Estaciones activas" value={totalStations} />
        <StatCard label="Eventos recientes" value={recentEvents.length} sub="últimas detecciones" />
      </div>

      <section>
        <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
          Estaciones con disponibilidad
        </h2>
        {availableStations.length > 0 ? (
          <div className="grid gap-2">
            {availableStations.map((s) => (
              <StationCard
                key={s.id}
                id={s.id}
                name={s.name}
                establishment={s.establishment}
                municipio={s.municipio}
                disponibilidades={s.disponibilidades}
                admiteSalaEspera={s.admiteSalaEspera}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={IconGasStation}
            title="Sin disponibilidad ahora mismo"
            description="Te notificaremos cuando aparezca algo en tus provincias."
          />
        )}
      </section>

      {recentEvents.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text)" }}>
            Eventos recientes
          </h2>
          <div className="space-y-2">
            {recentEvents.map((ev) => (
              <div
                key={ev.id}
                className="cw-card flex items-center gap-3 p-3"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "var(--brand-fill)", color: "var(--brand)" }}
                >
                  <IconBell size={16} stroke={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                    {ev.station.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {ev.province.name} ·{" "}
                    {new Intl.DateTimeFormat("es", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(ev.detectedAt)}
                  </p>
                </div>
                <Link
                  href={`/stations/${ev.stationId}`}
                  className="text-xs shrink-0"
                  style={{ color: "var(--brand)" }}
                >
                  Ver →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
