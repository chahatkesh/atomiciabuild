import { MyShiftsList } from "@/components/shifts";
import { requireUserPage } from "@/modules/auth/server";

export default async function MyShiftsPage() {
  await requireUserPage();

  return <MyShiftsList />;
}
