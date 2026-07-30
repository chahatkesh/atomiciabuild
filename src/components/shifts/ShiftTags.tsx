"use client";

import { Tag } from "antd";

import type { RoleRequirements, StaffingStatus } from "@/types";

const STATUS_LABEL: Record<StaffingStatus, string> = {
  fully_staffed: "Fully staffed",
  partially_staffed: "Partially staffed",
  empty: "Empty",
};

const STATUS_COLOR: Record<StaffingStatus, string> = {
  fully_staffed: "success",
  partially_staffed: "warning",
  empty: "error",
};

export function StaffingStatusTag({ status }: { status: StaffingStatus }) {
  return <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>;
}

const PROFESSION_LABEL: Record<keyof RoleRequirements, string> = {
  doctor: "doctor",
  nurse: "nurse",
  receptionist: "receptionist",
};

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function RequirementTags({ requirements }: { requirements: RoleRequirements }) {
  const entries = (Object.keys(PROFESSION_LABEL) as Array<keyof RoleRequirements>).filter(
    (profession) => requirements[profession] > 0,
  );

  if (entries.length === 0) {
    return <span className="type-caption">No requirements</span>;
  }

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
      {entries.map((profession) => (
        <Tag key={profession}>
          {pluralize(requirements[profession], PROFESSION_LABEL[profession])}
        </Tag>
      ))}
    </span>
  );
}

export function MissingRoleTags({ missing }: { missing: RoleRequirements }) {
  const entries = (Object.keys(PROFESSION_LABEL) as Array<keyof RoleRequirements>).filter(
    (profession) => missing[profession] > 0,
  );

  if (entries.length === 0) {
    return <Tag color="success">Nothing missing</Tag>;
  }

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
      {entries.map((profession) => (
        <Tag key={profession} color="warning">
          {pluralize(missing[profession], PROFESSION_LABEL[profession])}
        </Tag>
      ))}
    </span>
  );
}
