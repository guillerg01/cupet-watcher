import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/infra/db/prisma";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [user, userProvinces, allProvinces, xutilLink] = await Promise.all([
    prisma.appUser.findUnique({
      where: { id: userId },
      select: { notifyNew: true, notifyAvailable: true, notifyWaitroom: true, email: true, name: true },
    }),
    prisma.userProvince.findMany({ where: { userId }, select: { provinceId: true } }),
    prisma.province.findMany({ orderBy: { name: "asc" } }),
    prisma.xutilLink.findUnique({
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
