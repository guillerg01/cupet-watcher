import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const session = await requireAdmin();

  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Administración
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {session.user.email}
        </p>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
