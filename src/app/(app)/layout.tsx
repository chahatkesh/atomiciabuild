import { AppShell } from "@/components/layout";
import { requireUserPage } from "@/modules/auth/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage();

  return (
    <AppShell role={user.role} userName={user.name}>
      {children}
    </AppShell>
  );
}
