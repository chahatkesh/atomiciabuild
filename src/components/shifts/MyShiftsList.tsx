"use client";

import { CalendarOutlined, ReloadOutlined } from "@ant-design/icons";
import { App, Button, Card, Empty, List, Space, Tag } from "antd";
import dayjs from "dayjs";

import { StaffingStatusTag } from "@/components/shifts/ShiftTags";
import { useMyShifts, useReleaseClaim } from "@/hooks/useClaims";
import { ApiRequestError } from "@/lib/api/client";
import { colors, spacing } from "@/theme";
import type { MyShift } from "@/modules/claims/types";

function errorMessageFrom(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function formatWindow(shift: MyShift): string {
  const crossesMidnight = !dayjs(shift.endAt).isSame(dayjs(shift.startAt), "day");
  const suffix = crossesMidnight ? " (+1)" : "";
  return `${shift.startTime.replace("+1", "")} – ${shift.endTime.replace("+1", "")}${suffix}`;
}

function groupLabel(shift: MyShift): string {
  const date = dayjs(shift.startAt);
  if (date.isBefore(dayjs(), "day")) {
    return "Past";
  }
  return date.isSame(dayjs(), "day") ? "Today" : "Upcoming";
}

export function MyShiftsList() {
  const { message, modal } = App.useApp();
  const myShifts = useMyShifts();
  const releaseClaim = useReleaseClaim();

  const shifts = myShifts.data ?? [];
  const upcoming = shifts.filter((shift) => !dayjs(shift.endAt).isBefore(dayjs()));
  const past = shifts.filter((shift) => dayjs(shift.endAt).isBefore(dayjs()));

  const handleRelease = (shift: MyShift) => {
    modal.confirm({
      title: "Leave this shift?",
      content: `${shift.date} ${formatWindow(shift)} will be offered back to the team.`,
      okText: "Leave shift",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await releaseClaim.mutateAsync({ shiftId: shift.shiftId });
          message.success("You have left the shift");
        } catch (error) {
          message.error(errorMessageFrom(error));
        }
      },
    });
  };

  const renderItem = (shift: MyShift) => {
    const isPast = dayjs(shift.endAt).isBefore(dayjs());

    return (
      <List.Item
        key={shift.claimId}
        actions={
          isPast
            ? undefined
            : [
                <Button
                  key="leave"
                  size="small"
                  danger
                  loading={releaseClaim.isPending}
                  onClick={() => handleRelease(shift)}
                >
                  Leave
                </Button>,
              ]
        }
      >
        <List.Item.Meta
          avatar={<CalendarOutlined style={{ fontSize: 20, color: colors.inkMuted }} />}
          title={
            <Space wrap size={8}>
              <span style={{ color: colors.ink }}>{dayjs(shift.date).format("ddd, MMM D")}</span>
              <span className="type-caption">{formatWindow(shift)}</span>
              {shift.source === "manager" && <Tag>Assigned by a manager</Tag>}
            </Space>
          }
          description={
            <Space wrap size={8}>
              <Tag color="cyan">{shift.profession}</Tag>
              <StaffingStatusTag status={shift.staffingStatus} />
              <span className="type-caption">{groupLabel(shift)}</span>
            </Space>
          }
        />
      </List.Item>
    );
  };

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card
        title={`My shifts${upcoming.length > 0 ? ` (${upcoming.length} upcoming)` : ""}`}
        extra={
          <Button
            type="text"
            icon={<ReloadOutlined />}
            aria-label="Refresh my shifts"
            loading={myShifts.isFetching}
            onClick={() => myShifts.refetch()}
          />
        }
      >
        {myShifts.isError ? (
          <Empty description={errorMessageFrom(myShifts.error)} />
        ) : (
          <List
            loading={myShifts.isLoading}
            dataSource={upcoming}
            renderItem={renderItem}
            locale={{
              emptyText: (
                <div style={{ padding: spacing.xl }}>
                  <Empty description="You have not claimed any upcoming shifts yet." />
                </div>
              ),
            }}
          />
        )}
      </Card>

      {past.length > 0 && (
        <Card title="Already worked">
          <List dataSource={past} renderItem={renderItem} />
        </Card>
      )}
    </Space>
  );
}
