"use client";

import { Progress } from "antd";

import styles from "@/components/coverage/coverage.module.css";
import { PROFESSIONS } from "@/constants";
import type { CoverageTotals } from "@/modules/coverage/types";
import { colors, spacing } from "@/theme";
import type { Profession } from "@/types";

const ROLE_LABEL: Record<Profession, string> = {
  doctor: "Doctors",
  nurse: "Nurses",
  receptionist: "Receptionists",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      style={{
        padding: spacing.sm,
        borderRadius: 10,
        border: `1px solid ${colors.hairlineSoft}`,
        background: colors.surface2,
      }}
    >
      <p className="type-caption" style={{ margin: 0 }}>
        {label}
      </p>
      <p style={{ margin: "2px 0 0", fontSize: 24, fontWeight: 600, letterSpacing: "-0.5px" }}>
        {value}
      </p>
      {hint ? (
        <p className="type-caption" style={{ margin: "2px 0 0", fontSize: 12 }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function CoverageSummary({ totals }: { totals: CoverageTotals }) {
  const percent = totals.required === 0 ? 0 : Math.round((totals.filled / totals.required) * 100);
  const missingRoles = PROFESSIONS.filter((profession) => totals.missing[profession] > 0);

  const strokeColor =
    percent === 100
      ? colors.semanticSuccess
      : percent === 0
        ? colors.semanticDanger
        : colors.semanticWarning;

  return (
    <div style={{ display: "grid", gap: spacing.sm }}>
      <div className={styles.summaryGrid}>
        <Stat label="Shifts this week" value={String(totals.shifts)} />
        <Stat
          label="Fully staffed"
          value={String(totals.fullyStaffed)}
          hint={`${totals.partiallyStaffed} partial · ${totals.empty} empty`}
        />
        <Stat
          label="Slots filled"
          value={`${totals.filled}/${totals.required}`}
          hint={`${totals.required - totals.filled} still open`}
        />
        <Stat
          label="Roles missing"
          value={
            missingRoles.length === 0
              ? "None"
              : missingRoles
                  .map((profession) => `${totals.missing[profession]} ${ROLE_LABEL[profession]}`)
                  .join(" · ")
          }
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
        <span className="type-caption" style={{ whiteSpace: "nowrap" }}>
          Week coverage
        </span>
        <Progress
          percent={percent}
          strokeColor={strokeColor}
          railColor={colors.hairline}
          size="small"
          style={{ margin: 0 }}
        />
      </div>
    </div>
  );
}
