import { ShiftsManager } from "@/components/shifts";
import { requireUserPage } from "@/modules/auth/server";

export default async function ShiftsPage() {
  const user = await requireUserPage();

  return <ShiftsManager canManage={user.role === "manager"} />;
}
