"use client";

import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { App, Button, Card, Empty, Space, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { ShiftFormModal, type ShiftFormSubmit } from "@/components/shifts/ShiftFormModal";
import { MissingRoleTags, RequirementTags, StaffingStatusTag } from "@/components/shifts/ShiftTags";
import { useCreateShift, useDeleteShift, useShifts, useUpdateShift } from "@/hooks/useShifts";
import { ApiRequestError } from "@/lib/api/client";
import { colors, spacing } from "@/theme";
import type { ShiftRecord } from "@/modules/shifts/types";

interface ShiftsManagerProps {
  canManage: boolean;
}

function formatWindow(shift: ShiftRecord): string {
  const crossesMidnight = !dayjs(shift.endAt).isSame(dayjs(shift.startAt), "day");
  const suffix = crossesMidnight ? " (+1)" : "";
  return `${shift.startTime.replace("+1", "")} – ${shift.endTime.replace("+1", "")}${suffix}`;
}

function errorMessageFrom(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export function ShiftsManager({ canManage }: ShiftsManagerProps) {
  const { message, modal } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftRecord | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const shiftsQuery = useShifts();
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();

  const shifts = useMemo(() => shiftsQuery.data ?? [], [shiftsQuery.data]);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (shift: ShiftRecord) => {
    setEditing(shift);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (values: ShiftFormSubmit) => {
    setFormError(null);

    try {
      if (editing) {
        await updateShift.mutateAsync({ id: editing.id, payload: values });
        message.success("Shift updated");
      } else {
        await createShift.mutateAsync(values);
        message.success("Shift created");
      }
      setModalOpen(false);
    } catch (error) {
      setFormError(errorMessageFrom(error));
    }
  };

  const handleDelete = (shift: ShiftRecord) => {
    modal.confirm({
      title: "Delete this shift?",
      content: `${shift.date} ${formatWindow(shift)} will be permanently removed.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteShift.mutateAsync(shift.id);
          message.success("Shift deleted");
        } catch (error) {
          message.error(errorMessageFrom(error));
        }
      },
    });
  };

  const columns: ColumnsType<ShiftRecord> = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) => (
        <span>
          <div style={{ color: colors.ink }}>{dayjs(date).format("ddd, MMM D")}</div>
          <div className="type-caption">{date}</div>
        </span>
      ),
      sorter: (a, b) => a.startAt.localeCompare(b.startAt),
      defaultSortOrder: "ascend",
    },
    {
      title: "Time",
      key: "time",
      render: (_, shift) => formatWindow(shift),
      responsive: ["sm"],
    },
    {
      title: "Requirements",
      key: "requirements",
      render: (_, shift) => <RequirementTags requirements={shift.requirements} />,
      responsive: ["md"],
    },
    {
      title: "Status",
      key: "status",
      render: (_, shift) => <StaffingStatusTag status={shift.status} />,
    },
    {
      title: "Still missing",
      key: "missing",
      render: (_, shift) => <MissingRoleTags missing={shift.missing} />,
      responsive: ["lg"],
    },
    ...(canManage
      ? [
          {
            title: "Actions",
            key: "actions",
            align: "right" as const,
            render: (_: unknown, shift: ShiftRecord) => (
              <Space>
                <Tooltip title="Edit shift">
                  <Button
                    type="text"
                    aria-label="Edit shift"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(shift)}
                  />
                </Tooltip>
                <Tooltip title="Delete shift">
                  <Button
                    type="text"
                    danger
                    aria-label="Delete shift"
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(shift)}
                  />
                </Tooltip>
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card
      title="All shifts"
      extra={
        <Space>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            aria-label="Refresh shifts"
            onClick={() => shiftsQuery.refetch()}
            loading={shiftsQuery.isFetching}
          />
          {canManage && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              New shift
            </Button>
          )}
        </Space>
      }
    >
      {shiftsQuery.isError ? (
        <Empty description={errorMessageFrom(shiftsQuery.error)} />
      ) : (
        <Table<ShiftRecord>
          rowKey="id"
          columns={columns}
          dataSource={shifts}
          loading={shiftsQuery.isLoading}
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 12, hideOnSinglePage: true }}
          locale={{
            emptyText: (
              <div style={{ padding: spacing.xl }}>
                <Empty
                  description={
                    canManage
                      ? "No shifts yet. Create one to get started."
                      : "No shifts have been scheduled yet."
                  }
                />
              </div>
            ),
          }}
        />
      )}

      <ShiftFormModal
        open={modalOpen}
        shift={editing}
        submitting={createShift.isPending || updateShift.isPending}
        errorMessage={formError}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
