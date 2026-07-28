import { Card, Empty, Typography } from "antd";

export default function MyShiftsPage() {
  return (
    <Card title="My shifts">
      <Typography.Paragraph type="secondary">
        Staff claim and unclaim shifts here in Phase 2.
      </Typography.Paragraph>
      <Empty description="You have not claimed any shifts yet" />
    </Card>
  );
}
