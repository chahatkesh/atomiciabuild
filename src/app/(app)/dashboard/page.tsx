import { CoverageDashboard } from "@/components/coverage";
import { requireUserPage } from "@/modules/auth/server";

export default async function DashboardPage() {
  const user = await requireUserPage();

  // Managers open the week to audit it; staff open it to find a gap to fill.
  return <CoverageDashboard defaultLens={user.role === "manager" ? "all" : "gaps"} />;
}
