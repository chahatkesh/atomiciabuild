import { CoverageDashboard } from "@/components/coverage";
import { requireUser } from "@/modules/auth/server";
import { spacing } from "@/theme";

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.name.split(" ")[0];

  return (
    <div style={{ display: "grid", gap: spacing.lg }}>
      <div>
        <h1 className="type-display-md" style={{ margin: 0 }}>
          {user.role === "manager" ? `Coverage, ${firstName}` : `Where you're needed, ${firstName}`}
        </h1>
        <p className="type-body-lg" style={{ margin: `${spacing.xxs}px 0 0` }}>
          {user.role === "manager"
            ? "Every shift this week, its staffing status, and which roles are still missing."
            : "Shifts that are still short-staffed this week. Claim one from the Shifts page."}
        </p>
      </div>

      <CoverageDashboard />
    </div>
  );
}
