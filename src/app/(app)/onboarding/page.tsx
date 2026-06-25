import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { repo, Province, UserProvince } from "@/infra/db";
import { saveProvincesAction } from "./actions";

export default async function OnboardingPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const provinceRepo = await repo(Province);
  const userProvinceRepo = await repo(UserProvince);

  const [provinces, userProvinces] = await Promise.all([
    provinceRepo.find({ order: { name: "ASC" } }),
    userProvinceRepo.find({ where: { userId } }),
  ]);

  const selectedIds = new Set(userProvinces.map((up) => up.provinceId));

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Configurá tu cuenta
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Sesión activa con {session.user.email}. Elegí provincias y alertas por correo.
        </p>
      </div>

      <form action={saveProvincesAction} className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
            Provincias a monitorear
          </h2>
          <div className="grid gap-2">
            {provinces.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                style={{
                  background: selectedIds.has(p.id) ? "var(--surface-2)" : "var(--surface)",
                  border: `1px solid ${selectedIds.has(p.id) ? "var(--brand)" : "var(--border)"}`,
                }}
              >
                <input
                  type="checkbox"
                  name="provinceIds"
                  value={p.id}
                  defaultChecked={selectedIds.has(p.id)}
                  className="accent-[var(--brand)]"
                />
                <span className="text-sm" style={{ color: "var(--text)" }}>
                  {p.name}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
            Alertas por correo
          </h2>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="notifyNew"
              className="mt-1 accent-[var(--brand)]"
            />
            <span className="text-sm" style={{ color: "var(--text)" }}>
              Avisarme cuando aparezca un cupet nuevo en mis provincias
            </span>
          </label>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Podés cambiar esto después en Ajustes. Requiere RESEND_API_KEY configurada en el servidor.
          </p>
        </section>

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl font-semibold text-sm"
          style={{ background: "var(--brand)", color: "#0f172a" }}
        >
          Guardar y continuar
        </button>
      </form>
    </div>
  );
}
