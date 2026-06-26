import { NextResponse } from "next/server";
import { repo, Station, DetectionEvent, DetectionType } from "@/infra/db";
import { deviceFromRequest } from "@/lib/device-auth";
import { MoreThan } from "typeorm";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  if (!deviceFromRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stationRepo = await repo(Station);
  const eventRepo = await repo(DetectionEvent);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalActive, withAvailability, byProvince, recentNew] = await Promise.all([
    stationRepo.count({ where: { active: true } }),
    stationRepo.count({ where: { active: true, disponibilidades: MoreThan(0) } }),
    stationRepo
      .createQueryBuilder("s")
      .leftJoin("s.province", "p")
      .select("p.id", "provinceId")
      .addSelect("p.name", "provinceName")
      .addSelect("COUNT(s.id)", "total")
      .addSelect("SUM(CASE WHEN s.disponibilidades > 0 THEN 1 ELSE 0 END)", "available")
      .where("s.active = true")
      .groupBy("p.id")
      .addGroupBy("p.name")
      .orderBy("total", "DESC")
      .getRawMany<{ provinceId: string; provinceName: string; total: string; available: string }>(),
    eventRepo.count({ where: { detectedAt: MoreThan(weekAgo), type: DetectionType.NEW } }),
  ]);

  return NextResponse.json({
    totalActive,
    withAvailability,
    withoutAvailability: totalActive - withAvailability,
    recentNew,
    byProvince: byProvince.map((r) => ({
      provinceId: Number(r.provinceId),
      provinceName: r.provinceName,
      total: Number(r.total),
      available: Number(r.available),
    })),
  });
}
