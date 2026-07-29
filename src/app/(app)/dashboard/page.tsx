import { Empty } from "antd";

import { colors, spacing } from "@/theme";

export default function DashboardPage() {
  return (
    <div
      style={{
        display: "grid",
        gap: spacing.lg,
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      }}
    >
      <div className="gradient-spotlight" style={{ minHeight: 180 }}>
        <p className="type-caption" style={{ margin: `0 0 ${spacing.sm}px`, color: colors.ink }}>
          Phase 3
        </p>
        <h2 className="type-subhead" style={{ margin: `0 0 ${spacing.sm}px` }}>
          Week-at-a-glance coverage
        </h2>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.85)", fontSize: 15, lineHeight: 1.3 }}>
          Staffing status, missing roles, and live-ish polling land here next.
        </p>
      </div>

      <div className="surface-card">
        <h2 className="type-headline" style={{ margin: `0 0 ${spacing.sm}px`, color: colors.ink }}>
          Coverage dashboard
        </h2>
        <p className="type-body-lg" style={{ margin: `0 0 ${spacing.lg}px` }}>
          Week-at-a-glance staffing coverage will be implemented in Phase 3.
        </p>
        <Empty description="No coverage data yet" />
      </div>
    </div>
  );
}
