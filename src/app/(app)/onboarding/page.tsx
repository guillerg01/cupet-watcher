import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/infra/db/prisma";
import ProvinceMultiSelect from "@/components/ProvinceMultiSelect";
import { saveProvincesAction } from "./actions";

export default async function OnboardingPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [provinces, userProvinces] = await Promise.all([
    prisma.province.findMany({ orderBy: { name: "asc" } }),
    prisma.userProvince.findMany({ where: { userId: session.user.id } }),
  ]);

  const selectedIds = userProvinces.map((up) => up.provinceId);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          ¿En qué provincias tenés cuenta de xutil?
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Seleccioná las provincias para recibir notificaciones de cupets disponibles.
        </p>
      </div>

      <form action={saveProvincesAction} className="space-y-6">
        <ProvinceMultiSelect
          provinces={provinces}
          selected={selectedIds}
          name="provinceIds"
        />

        <button
          type="submit"
          className="w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-sm transition-all"
          style={{ background: "var(--brand)", color: "#0f172a" }}
        >
          Guardar y continuar
        </button>
      </form>
    </div>
  );
}
