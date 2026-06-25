import { requireAdmin } from "@/lib/admin";
import { repo, AppUser, UserProvince, Province, UserRole } from "@/infra/db";

export const dynamic = "force-dynamic";

export default async function AdminSubscribersPage(): Promise<React.JSX.Element> {
  await requireAdmin();

  const userRepo = await repo(AppUser);
  const users = await userRepo.find({
    where: { role: UserRole.USER },
    order: { createdAt: "DESC" },
    take: 200,
  });

  const userIds = users.map((u) => u.id);
  const provinceRepo = await repo(Province);
  const allProvinces = await provinceRepo.find();
  const provinceById = new Map(allProvinces.map((p) => [p.id, p.name]));

  const userProvinceRepo = await repo(UserProvince);
  const links =
    userIds.length > 0
      ? await userProvinceRepo
          .createQueryBuilder("up")
          .where("up.userId IN (:...userIds)", { userIds })
          .getMany()
      : [];

  const provincesByUser = new Map<string, string[]>();
  for (const link of links) {
    const name = provinceById.get(link.provinceId) ?? String(link.provinceId);
    const list = provincesByUser.get(link.userId) ?? [];
    list.push(name);
    provincesByUser.set(link.userId, list);
  }

  const fmt = new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {users.length} suscriptor{users.length !== 1 ? "es" : ""} (máx. 200 mostrados)
      </p>
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--surface)" }}>
            <tr>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Registro</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Email</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Nombre</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Provincias</th>
              <th className="text-left p-3 font-medium" style={{ color: "var(--text-muted)" }}>Alertas</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td className="p-3 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                  {fmt.format(u.createdAt)}
                </td>
                <td className="p-3" style={{ color: "var(--text)" }}>{u.email}</td>
                <td className="p-3" style={{ color: "var(--text)" }}>{u.name ?? "—"}</td>
                <td className="p-3 max-w-xs" style={{ color: "var(--text-muted)" }}>
                  {(provincesByUser.get(u.id) ?? []).join(", ") || "—"}
                </td>
                <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>
                  {[
                    u.notifyNew && "nuevo",
                    u.notifyAvailable && "disponible",
                    u.notifyWaitroom && "sala",
                  ]
                    .filter(Boolean)
                    .join(", ") || "ninguna"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
