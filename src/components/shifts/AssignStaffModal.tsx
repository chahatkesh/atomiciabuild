"use client";

import { Alert, Modal, Select, Space } from "antd";
import { useMemo, useState } from "react";

import { useStaffDirectory } from "@/hooks/useClaims";
import type { ShiftListItem } from "@/modules/claims/types";
import type { Profession } from "@/types";
import { PROFESSIONS } from "@/constants";

interface AssignStaffModalProps {
  open: boolean;
  shift: ShiftListItem | null;
  submitting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onSubmit: (userId: string) => void;
}

export function AssignStaffModal({
  open,
  shift,
  submitting,
  errorMessage,
  onCancel,
  onSubmit,
}: AssignStaffModalProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const directory = useStaffDirectory(open);

  const alreadyOn = useMemo(
    () => new Set((shift?.claims ?? []).map((claim) => claim.userId)),
    [shift],
  );

  /**
   * Only professions the shift still needs are offered. The server enforces
   * this too; narrowing the list just avoids a guaranteed rejection.
   */
  const neededProfessions = useMemo(() => {
    if (!shift) {
      return new Set<Profession>();
    }
    return new Set(PROFESSIONS.filter((profession) => shift.missing[profession] > 0));
  }, [shift]);

  const options = useMemo(() => {
    const staff = directory.data ?? [];

    return staff
      .filter((person) => person.profession && neededProfessions.has(person.profession))
      .filter((person) => !alreadyOn.has(person.id))
      .map((person) => ({
        value: person.id,
        label: `${person.fullName} — ${person.profession}`,
      }));
  }, [directory.data, neededProfessions, alreadyOn]);

  const handleOk = () => {
    if (userId) {
      onSubmit(userId);
    }
  };

  return (
    <Modal
      open={open}
      title="Assign someone to this shift"
      okText="Assign"
      confirmLoading={submitting}
      okButtonProps={{ disabled: !userId }}
      onCancel={() => {
        setUserId(null);
        onCancel();
      }}
      onOk={handleOk}
      afterClose={() => setUserId(null)}
      destroyOnHidden
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {shift && (
          <div className="type-caption">
            {shift.date} · {shift.startTime}–{shift.endTime}
          </div>
        )}

        {errorMessage && <Alert type="error" showIcon message={errorMessage} />}

        {neededProfessions.size === 0 ? (
          <Alert
            type="info"
            showIcon
            message="This shift is already fully staffed."
            description="Remove someone first to free up a slot."
          />
        ) : (
          <Select
            showSearch
            style={{ width: "100%" }}
            placeholder="Search staff by name"
            loading={directory.isLoading}
            value={userId}
            onChange={setUserId}
            options={options}
            optionFilterProp="label"
            notFoundContent={
              directory.isLoading ? "Loading…" : "Nobody available for the missing roles"
            }
          />
        )}
      </Space>
    </Modal>
  );
}
