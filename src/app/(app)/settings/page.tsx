import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { repo, AppUser, UserProvince, Province, XutilLink } from "@/infra/db";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const userRepo = await repo(AppUser);
  const userProvinceRepo = await repo(UserProvince);
  const provinceRepo = await repo(Province);
  const linkRepo = await repo(XutilLink);

  const [user, userProvinces, allProvinces, xutilLink] = await Promise.all([
    userRepo.findOne({
      where: { id: userId },
      select: {
        notifyNew: true,
        notifyAvailable: true,
        notifyWaitroom: true,
        email: true,
        name: true,
      },
    }),
    userProvinceRepo.find({ where: { userId }, select: { provinceId: true } }),
    provinceRepo.find({ order: { name: "ASC" } }),
    linkRepo.findOne({
      where: { userId },
      select: { xutilUsername: true, tokenExp: true },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <SettingsClient
      user={user}
      userProvinceIds={userProvinces.map((up) => up.provinceId)}
      allProvinces={allProvinces}
      xutilLink={xutilLink ?? undefined}
    />
  );
}
