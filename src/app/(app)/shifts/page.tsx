import { Empty } from "antd";

import { colors, spacing } from "@/theme";

export default function ShiftsPage() {
  return (
    <div className="surface-card">
      <h2 className="type-headline" style={{ margin: `0 0 ${spacing.sm}px`, color: colors.ink }}>
        Shift management
      </h2>
      <p className="type-body-lg" style={{ margin: `0 0 ${spacing.lg}px` }}>
        Managers will create, edit, and delete shifts here in Phase 1.
      </p>
      <Empty description="No shifts yet" />
    </div>
  );
}
