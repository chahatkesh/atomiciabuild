"use client";

import { Card, Empty, Segmented, Space, Statistic, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";

import type { ImportSectionResult, RowReport } from "@/modules/imports/import.types";
import type { ImportVerdict } from "@/types";
import { colors, spacing } from "@/theme";

const VERDICT_COLOR: Record<ImportVerdict, string> = {
  accepted: "success",
  repaired: "processing",
  merged: "warning",
  rejected: "error",
};

const VERDICT_HELP: Record<ImportVerdict, string> = {
  accepted: "Imported exactly as written",
  repaired: "Imported after fixing a recoverable problem",
  merged: "Folded into another row describing the same thing",
  rejected: "Not imported",
};

type VerdictFilter = ImportVerdict | "all";

function RawRowCell({ raw }: { raw: Record<string, string> }) {
  return (
    <code style={{ fontSize: 12, color: colors.inkMuted, whiteSpace: "pre-wrap" }}>
      {Object.entries(raw)
        .map(([key, value]) => `${key}=${value === "" ? "∅" : value}`)
        .join("  ")}
    </code>
  );
}

const columns: ColumnsType<RowReport> = [
  {
    title: "Row",
    dataIndex: "rowNumber",
    key: "rowNumber",
    width: 72,
    sorter: (a, b) => a.rowNumber - b.rowNumber,
    defaultSortOrder: "ascend",
  },
  {
    title: "Verdict",
    dataIndex: "verdict",
    key: "verdict",
    width: 120,
    render: (verdict: ImportVerdict) => (
      <Tooltip title={VERDICT_HELP[verdict]}>
        <Tag color={VERDICT_COLOR[verdict]}>{verdict}</Tag>
      </Tooltip>
    ),
  },
  {
    title: "Original row",
    key: "raw",
    render: (_, row) => <RawRowCell raw={row.raw} />,
    responsive: ["lg"],
  },
  {
    title: "What was wrong",
    key: "issues",
    render: (_, row) =>
      row.issues.length === 0 ? (
        <span className="type-caption">Nothing</span>
      ) : (
        <ul style={{ margin: 0, paddingLeft: spacing.md }}>
          {row.issues.map((issue) => (
            <li key={issue} style={{ fontSize: 13 }}>
              {issue}
            </li>
          ))}
        </ul>
      ),
  },
  {
    title: "What we did",
    dataIndex: "action",
    key: "action",
    render: (action: string) => <span style={{ fontSize: 13 }}>{action}</span>,
  },
];

export function ImportSectionReport({ section }: { section: ImportSectionResult }) {
  const [filter, setFilter] = useState<VerdictFilter>("all");

  const rows = useMemo(
    () => (filter === "all" ? section.rows : section.rows.filter((row) => row.verdict === filter)),
    [section.rows, filter],
  );

  const { counts } = section;

  return (
    <Card
      title={
        <Space>
          <span style={{ textTransform: "capitalize" }}>{section.kind}</span>
          <span className="type-caption">{counts.total} rows read</span>
        </Space>
      }
      extra={
        <Segmented<VerdictFilter>
          size="small"
          value={filter}
          onChange={setFilter}
          options={[
            { label: `All (${counts.total})`, value: "all" },
            { label: `Accepted (${counts.accepted})`, value: "accepted" },
            { label: `Repaired (${counts.repaired})`, value: "repaired" },
            { label: `Merged (${counts.merged})`, value: "merged" },
            { label: `Rejected (${counts.rejected})`, value: "rejected" },
          ]}
        />
      }
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space size="large" wrap>
          <Statistic title="Written to database" value={section.persisted} />
          <Statistic title="Accepted" value={counts.accepted} />
          <Statistic title="Repaired" value={counts.repaired} />
          <Statistic title="Merged" value={counts.merged} />
          <Statistic
            title="Rejected"
            value={counts.rejected}
            valueStyle={counts.rejected > 0 ? { color: "#ff4d4f" } : undefined}
          />
        </Space>

        <Typography.Paragraph className="type-caption" style={{ marginBottom: 0 }}>
          {counts.merged} row{counts.merged === 1 ? "" : "s"} described something already covered by
          an earlier row, so {counts.merged === 1 ? "it was" : "they were"} folded in rather than
          creating duplicates. Rejected rows were left out entirely.
        </Typography.Paragraph>

        <Table<RowReport>
          rowKey="rowNumber"
          size="small"
          columns={columns}
          dataSource={rows}
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 15, showSizeChanger: false, hideOnSinglePage: true }}
          locale={{ emptyText: <Empty description={`No ${filter} rows`} /> }}
        />
      </Space>
    </Card>
  );
}
