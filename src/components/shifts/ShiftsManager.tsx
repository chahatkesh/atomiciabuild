"use client";

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { Alert, App, Button, Card, Empty, Space, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

import { AssignStaffModal } from "@/components/shifts/AssignStaffModal";
import { ShiftFormModal, type ShiftFormSubmit } from "@/components/shifts/ShiftFormModal";
import { ShiftRoster } from "@/components/shifts/ShiftRoster";
import { MissingRoleTags, RequirementTags, StaffingStatusTag } from "@/components/shifts/ShiftTags";
import { useClaimShift, useReleaseClaim } from "@/hooks/useClaims";
import { useCreateShift, useDeleteShift, useShifts, useUpdateShift } from "@/hooks/useShifts";
import { ApiRequestError } from "@/lib/api/client";
import { formatShiftWindow } from "@/lib/time/format";
import { colors, spacing } from "@/theme";
import type { ClaimRecord, ShiftListItem } from "@/modules/claims/types";
import type { ReleasedClaimSummary } from "@/modules/claims/types";
import type { Profession } from "@/types";

interface ShiftsManagerProps {
  canManage: boolean;
  /** Absent for managers, who have no profession and therefore cannot claim. */
  profession?: Profession;
}

function formatWindow(shift: ShiftListItem): string {
  return formatShiftWindow(shift);
}

function errorMessageFrom(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

/** Turns the server's release list into one readable sentence for a toast. */
function describeReleases(released: ReleasedClaimSummary[]): string {
  if (released.length === 1) {
    return `${released[0].userName} was removed: ${released[0].reason.toLowerCase()}`;
  }
  return `${released.length} people were removed because the edit invalidated their claims`;
}

export function ShiftsManager({ canManage, profession }: ShiftsManagerProps) {
  const { message, modal } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftListItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<ShiftListItem | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const shiftsQuery = useShifts();
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();
  const claimShift = useClaimShift();
  const releaseClaim = useReleaseClaim();

  const shifts = useMemo(() => shiftsQuery.data ?? [], [shiftsQuery.data]);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (shift: ShiftListItem) => {
    setEditing(shift);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (values: ShiftFormSubmit) => {
    setFormError(null);

    try {
      if (editing) {
        const result = await updateShift.mutateAsync({ id: editing.id, payload: values });
        setModalOpen(false);

        if (result.releasedClaims.length > 0) {
          message.warning(describeReleases(result.releasedClaims), 6);
        } else {
          message.success("Shift updated");
        }
        return;
      }

      await createShift.mutateAsync(values);
      message.success("Shift created");
      setModalOpen(false);
    } catch (error) {
      setFormError(errorMessageFrom(error));
    }
  };

  const handleDelete = (shift: ShiftListItem) => {
    const claimCount = shift.claims.length;

    modal.confirm({
      title: "Delete this shift?",
      content:
        claimCount > 0
          ? `${shift.date} ${formatWindow(shift)} will be removed, and ${claimCount} ${
              claimCount === 1 ? "person" : "people"
            } will lose the shift.`
          : `${shift.date} ${formatWindow(shift)} will be permanently removed.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const result = await deleteShift.mutateAsync(shift.id);
          message.success(
            result.releasedClaims > 0
              ? `Shift deleted; ${result.releasedClaims} claim(s) released`
              : "Shift deleted",
          );
        } catch (error) {
          message.error(errorMessageFrom(error));
        }
      },
    });
  };

  const handleClaim = async (shift: ShiftListItem) => {
    try {
      await claimShift.mutateAsync({ shiftId: shift.id });
      message.success(`You are on ${shift.date} ${formatWindow(shift)}`);
    } catch (error) {
      message.error(errorMessageFrom(error), 6);
    }
  };

  const handleRelease = async (shift: ShiftListItem) => {
    try {
      await releaseClaim.mutateAsync({ shiftId: shift.id });
      message.success("You have left this shift");
    } catch (error) {
      message.error(errorMessageFrom(error));
    }
  };

  const handleRemovePerson = (shift: ShiftListItem, claim: ClaimRecord) => {
    modal.confirm({
      title: `Remove ${claim.userName}?`,
      content: `They will be taken off ${shift.date} ${formatWindow(shift)}.`,
      okText: "Remove",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await releaseClaim.mutateAsync({ shiftId: shift.id, userId: claim.userId });
          message.success(`${claim.userName} was removed`);
        } catch (error) {
          message.error(errorMessageFrom(error));
        }
      },
    });
  };

  const handleAssign = async (userId: string) => {
    if (!assigning) {
      return;
    }
    setAssignError(null);

    try {
      await claimShift.mutateAsync({ shiftId: assigning.id, userId });
      message.success("Staff member assigned");
      setAssigning(null);
    } catch (error) {
      setAssignError(errorMessageFrom(error));
    }
  };

  const canClaim = (shift: ShiftListItem): boolean =>
    Boolean(profession) && shift.missing[profession as Profession] > 0;

  const columns: ColumnsType<ShiftListItem> = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date: string) => (
        <span style={{ color: colors.ink }}>{dayjs(date).format("ddd, MMM D, YYYY")}</span>
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
    {
      title: "On this shift",
      key: "roster",
      responsive: ["lg"],
      render: (_, shift) => (
        <ShiftRoster
          claims={shift.claims}
          onRemove={canManage ? (claim) => handleRemovePerson(shift, claim) : undefined}
          removing={releaseClaim.isPending}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right" as const,
      render: (_, shift) => (
        <Space>
          {profession &&
            (shift.claimedByMe ? (
              <Button size="small" onClick={() => handleRelease(shift)}>
                Leave
              </Button>
            ) : (
              <Tooltip
                title={canClaim(shift) ? undefined : `No ${profession} slots left on this shift`}
              >
                <Button
                  size="small"
                  type="primary"
                  disabled={!canClaim(shift)}
                  loading={claimShift.isPending}
                  onClick={() => handleClaim(shift)}
                >
                  Claim
                </Button>
              </Tooltip>
            ))}

          {canManage && (
            <>
              <Tooltip title="Assign someone">
                <Button
                  type="text"
                  aria-label="Assign someone to this shift"
                  icon={<UserAddOutlined />}
                  onClick={() => {
                    setAssignError(null);
                    setAssigning(shift);
                  }}
                />
              </Tooltip>
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
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={`All shifts${shifts.length > 0 ? ` (${shifts.length})` : ""}`}
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
        <Alert
          type="error"
          showIcon
          title="Could not load shifts"
          description={errorMessageFrom(shiftsQuery.error)}
          action={
            <Button size="small" onClick={() => shiftsQuery.refetch()}>
              Retry
            </Button>
          }
        />
      ) : (
        <Table<ShiftListItem>
          rowKey="id"
          columns={columns}
          dataSource={shifts}
          loading={shiftsQuery.isLoading}
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 12, hideOnSinglePage: true, showSizeChanger: false }}
          locale={{
            emptyText: (
              <div style={{ padding: spacing.xl }}>
                <Empty
                  description={
                    canManage
                      ? "No shifts yet. Create one or import the clinic spreadsheet."
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

      <AssignStaffModal
        open={assigning !== null}
        shift={assigning}
        submitting={claimShift.isPending}
        errorMessage={assignError}
        onCancel={() => setAssigning(null)}
        onSubmit={handleAssign}
      />
    </Card>
  );
}
