"use client";

import { CloseOutlined } from "@ant-design/icons";
import { Space, Tag, Tooltip } from "antd";

import type { ClaimRecord } from "@/modules/claims/types";
import type { Profession } from "@/types";

const PROFESSION_COLOR: Record<Profession, string> = {
  doctor: "geekblue",
  nurse: "cyan",
  receptionist: "purple",
};

interface ShiftRosterProps {
  claims: ClaimRecord[];
  /** Managers get a remove affordance on each person. */
  onRemove?: (claim: ClaimRecord) => void;
  removing?: boolean;
}

export function ShiftRoster({ claims, onRemove, removing }: ShiftRosterProps) {
  if (claims.length === 0) {
    return <span className="type-caption">Nobody yet</span>;
  }

  return (
    <Space size={4} wrap>
      {claims.map((claim) => (
        <Tag
          key={claim.id}
          color={PROFESSION_COLOR[claim.profession]}
          closable={Boolean(onRemove) && !removing}
          closeIcon={
            onRemove ? <CloseOutlined aria-label={`Remove ${claim.userName}`} /> : undefined
          }
          onClose={(event) => {
            event.preventDefault();
            onRemove?.(claim);
          }}
        >
          <Tooltip title={`${claim.userEmail} · ${claim.profession}`}>
            {claim.userName}
            {claim.source === "manager" ? " (assigned)" : ""}
          </Tooltip>
        </Tag>
      ))}
    </Space>
  );
}
