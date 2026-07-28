import { Card, Empty, Typography } from "antd";

import { requireManagerPage } from "@/modules/auth/server";

export default async function ImportsPage() {
  await requireManagerPage();

  return (
    <Card title="Import report">
      <Typography.Paragraph type="secondary">
        CSV import results and manager upload UI will land in Phase 2.
      </Typography.Paragraph>
      <Empty description="No import runs yet" />
    </Card>
  );
}
