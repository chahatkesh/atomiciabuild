"use client";

import { InboxOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, Empty, Select, Space, Spin, Typography, Upload } from "antd";
import type { UploadFile } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { ImportSectionReport } from "@/components/imports/ImportSectionReport";
import { useImportRun, useImportRuns, useUploadImport } from "@/hooks/useImports";
import { ApiRequestError } from "@/lib/api/client";
import { spacing } from "@/theme";

function errorMessageFrom(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export function ImportManager() {
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const runs = useImportRuns();
  const run = useImportRun(selectedRunId);
  const upload = useUploadImport();

  const runOptions = useMemo(
    () =>
      (runs.data ?? []).map((entry) => ({
        value: entry.id,
        label: `${dayjs(entry.createdAt).format("MMM D, HH:mm")} · ${entry.source} · ${
          entry.totals.total
        } rows`,
      })),
    [runs.data],
  );

  const handleUpload = async () => {
    const files = fileList.flatMap((item) => (item.originFileObj ? [item.originFileObj] : []));

    if (files.length === 0) {
      setUploadError("Choose at least one CSV file first.");
      return;
    }

    setUploadError(null);

    try {
      const result = await upload.mutateAsync(files);
      setFileList([]);
      setSelectedRunId(result.id);
      message.success(
        `Imported ${result.totals.total} rows: ${result.totals.rejected} rejected, ${result.totals.merged} merged`,
        6,
      );
    } catch (error) {
      setUploadError(errorMessageFrom(error));
    }
  };

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Card title="Import a clinic spreadsheet">
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <Typography.Paragraph className="type-caption" style={{ marginBottom: 0 }}>
            Upload <code>staff.csv</code>, <code>shifts.csv</code>, or both. Files are matched by
            their column headers, and run through the same pipeline as the seed import — duplicates
            merge, repairable rows are fixed, and anything unusable is listed below with a reason.
          </Typography.Paragraph>

          {uploadError && <Alert type="error" showIcon title={uploadError} closable />}

          <Upload.Dragger
            multiple
            accept=".csv,text/csv"
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList: next }) => {
              setUploadError(null);
              setFileList(next.slice(-2));
            }}
            onRemove={(file) =>
              setFileList((current) => current.filter((item) => item.uid !== file.uid))
            }
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Drop CSV files here, or click to choose</p>
            <p className="ant-upload-hint">Up to two files, 2MB each</p>
          </Upload.Dragger>

          <Space>
            <Button
              type="primary"
              loading={upload.isPending}
              disabled={fileList.length === 0}
              onClick={handleUpload}
            >
              Run import
            </Button>
            {fileList.length > 0 && (
              <Button onClick={() => setFileList([])} disabled={upload.isPending}>
                Clear
              </Button>
            )}
          </Space>
        </Space>
      </Card>

      <Card
        title="Import report"
        extra={
          <Space>
            <Select
              style={{ minWidth: 260 }}
              placeholder="Most recent run"
              value={selectedRunId}
              onChange={setSelectedRunId}
              options={runOptions}
              loading={runs.isLoading}
              allowClear
              onClear={() => setSelectedRunId(null)}
            />
            <Button
              type="text"
              icon={<ReloadOutlined />}
              aria-label="Refresh report"
              loading={run.isFetching}
              onClick={() => {
                runs.refetch();
                run.refetch();
              }}
            />
          </Space>
        }
      >
        {run.isLoading ? (
          <div style={{ padding: spacing.xl, textAlign: "center" }}>
            <Spin />
          </div>
        ) : run.isError ? (
          <Empty description="No import has been run yet. Upload a CSV above to get started." />
        ) : (
          <Space orientation="vertical" size="large" style={{ width: "100%" }}>
            <Typography.Text className="type-caption">
              {run.data?.source === "seed" ? "Seed import" : "Manual upload"} ·{" "}
              {dayjs(run.data?.createdAt).format("MMM D, YYYY HH:mm")}
              {run.data?.fileName ? ` · ${run.data.fileName}` : ""}
            </Typography.Text>

            {run.data?.sections.map((section) => (
              <ImportSectionReport key={section.kind} section={section} />
            ))}
          </Space>
        )}
      </Card>
    </Space>
  );
}
