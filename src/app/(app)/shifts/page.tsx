import { Card, Empty, Typography } from "antd";

export default function ShiftsPage() {
  return (
    <Card title="Shift management">
      <Typography.Paragraph type="secondary">
        Managers will create, edit, and delete shifts here in Phase 1.
      </Typography.Paragraph>
      <Empty description="No shifts yet" />
    </Card>
  );
}
