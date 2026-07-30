"use client";

import { Tooltip } from "antd";

import styles from "@/components/coverage/coverage.module.css";
import { PROFESSIONS } from "@/constants";
import { formatShiftWindow } from "@/lib/time/format";
import type { CoverageShift } from "@/modules/coverage/types";
import type { Profession, StaffingStatus } from "@/types";

const STATUS_CLASS: Record<StaffingStatus, string> = {
  fully_staffed: styles.statusFull,
  partially_staffed: styles.statusPartial,
  empty: styles.statusEmpty,
};

const STATUS_LABEL: Record<StaffingStatus, string> = {
  fully_staffed: "Fully staffed",
  partially_staffed: "Partially staffed",
  empty: "Empty",
};

/** Single letter keeps three chips on one line inside a narrow day column. */
const ROLE_INITIAL: Record<Profession, string> = {
  doctor: "D",
  nurse: "N",
  receptionist: "R",
};

const ROLE_LABEL: Record<Profession, string> = {
  doctor: "doctor",
  nurse: "nurse",
  receptionist: "receptionist",
};

function rosterSummary(shift: CoverageShift): string {
  if (shift.claims.length === 0) {
    return "Nobody assigned yet.";
  }
  return shift.claims.map((claim) => `${claim.userName} (${claim.profession})`).join(", ");
}

function requirementSummary(shift: CoverageShift): string {
  const parts = PROFESSIONS.filter((profession) => shift.requirements[profession] > 0).map(
    (profession) =>
      `${shift.filled[profession]}/${shift.requirements[profession]} ${ROLE_LABEL[profession]}`,
  );
  return parts.length > 0 ? parts.join(" · ") : "No requirements set";
}

interface CoverageShiftCardProps {
  shift: CoverageShift;
  onSelect?: (shift: CoverageShift) => void;
}

export function CoverageShiftCard({ shift, onSelect }: CoverageShiftCardProps) {
  const missingRoles = PROFESSIONS.filter((profession) => shift.missing[profession] > 0);
  const filledSlots = PROFESSIONS.reduce(
    (total, profession) =>
      total + Math.min(shift.filled[profession], shift.requirements[profession]),
    0,
  );
  const requiredSlots = PROFESSIONS.reduce(
    (total, profession) => total + shift.requirements[profession],
    0,
  );

  const tooltip = (
    <div style={{ display: "grid", gap: 4, fontSize: 13 }}>
      <strong>
        {shift.date} · {formatShiftWindow(shift)}
      </strong>
      <span>{STATUS_LABEL[shift.status]}</span>
      <span>{requirementSummary(shift)}</span>
      <span style={{ opacity: 0.85 }}>{rosterSummary(shift)}</span>
    </div>
  );

  return (
    <Tooltip title={tooltip} mouseEnterDelay={0.25}>
      <button
        type="button"
        className={`${styles.shiftCard} ${STATUS_CLASS[shift.status]}`}
        onClick={() => onSelect?.(shift)}
        aria-label={`${shift.date} ${formatShiftWindow(shift)}, ${STATUS_LABEL[shift.status]}, ${requirementSummary(shift)}`}
      >
        <span className={styles.shiftTime}>
          <span>{formatShiftWindow(shift, "–")}</span>
          <span className={styles.shiftCount}>
            {filledSlots}/{requiredSlots}
          </span>
        </span>

        <span className={styles.roleRow}>
          {missingRoles.length === 0 ? (
            <span className={`${styles.chip} ${styles.chipCovered}`}>Covered</span>
          ) : (
            missingRoles.map((profession) => (
              <span key={profession} className={`${styles.chip} ${styles.chipMissing}`}>
                {shift.missing[profession]} {ROLE_INITIAL[profession]}
              </span>
            ))
          )}
        </span>
      </button>
    </Tooltip>
  );
}

export { ROLE_INITIAL, ROLE_LABEL, STATUS_LABEL };
