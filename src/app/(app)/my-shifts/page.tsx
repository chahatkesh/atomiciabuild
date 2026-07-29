import { Empty } from "antd";

import { colors, spacing } from "@/theme";

export default function MyShiftsPage() {
  return (
    <div className="surface-card">
      <h2 className="type-headline" style={{ margin: `0 0 ${spacing.sm}px`, color: colors.ink }}>
        My shifts
      </h2>
      <p className="type-body-lg" style={{ margin: `0 0 ${spacing.lg}px` }}>
        Staff claim and unclaim shifts here in Phase 2.
      </p>
      <Empty description="You have not claimed any shifts yet" />
    </div>
  );
}
