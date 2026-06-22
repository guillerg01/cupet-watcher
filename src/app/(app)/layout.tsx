import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      <AppNav />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">{children}</main>
    </div>
  );
}
