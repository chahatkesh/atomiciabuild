import { Card, Empty, Typography } from "antd";

export default function DashboardPage() {
  return (
    <Card title="Coverage dashboard">
      <Typography.Paragraph type="secondary">
        Week-at-a-glance staffing coverage will be implemented in Phase 3.
      </Typography.Paragraph>
      <Empty description="No coverage data yet" />
    </Card>
  );
}
