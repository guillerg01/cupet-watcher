import { NextResponse } from "next/server";
import { repo, Device, Station } from "@/infra/db";
import { deviceFromRequest } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const auth = deviceFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  const deviceRepo = await repo(Device);
  const device = await deviceRepo.findOne({ where: { id: auth.deviceId } });
  const watchIds = device?.watchProvinceIds ?? [];

  const stationRepo = await repo(Station);
  const qb = stationRepo
    .createQueryBuilder("s")
    .leftJoinAndSelect("s.province", "province")
    .where("s.active = true")
    .orderBy("s.disponibilidades", "DESC")
    .addOrderBy("s.name", "ASC")
    .take(200);

  if (watchIds.length > 0) {
    qb.andWhere("s.provinceId IN (:...watchIds)", { watchIds });
  }

  if (q) {
    qb.andWhere(
      "(LOWER(s.name) LIKE :q OR LOWER(s.establishment) LIKE :q OR LOWER(s.municipio) LIKE :q)",
      { q: `%${q}%` },
    );
  }

  const stations = await qb.getMany();

  return NextResponse.json({
    stations: stations.map((s) => ({
      id: s.id,
      name: s.name,
      establishment: s.establishment,
      provinceId: s.provinceId,
      provinceName: s.province?.name ?? "",
      municipio: s.municipio,
      disponibilidades: s.disponibilidades,
      admiteSalaEspera: s.admiteSalaEspera,
      confirmed: s.confirmed,
    })),
    filteredByProvinces: watchIds.length > 0,
    watchProvinceIds: watchIds,
  });
}
