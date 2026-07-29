import { Empty } from "antd";

import { requireManagerPage } from "@/modules/auth/server";
import { colors, spacing } from "@/theme";

export default async function ImportsPage() {
  await requireManagerPage();

  return (
    <div className="surface-card">
      <h2 className="type-headline" style={{ margin: `0 0 ${spacing.sm}px`, color: colors.ink }}>
        Import report
      </h2>
      <p className="type-body-lg" style={{ margin: `0 0 ${spacing.lg}px` }}>
        CSV import results and manager upload UI will land in Phase 2.
      </p>
      <Empty description="No import runs yet" />
    </div>
  );
}
