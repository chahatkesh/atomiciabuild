"use client";

import { Alert, Button, Modal, Skeleton } from "antd";
import dayjs from "dayjs";
import { useState } from "react";

import { STATUS_LABEL } from "@/components/coverage/CoverageShiftCard";
import { CoverageSummary } from "@/components/coverage/CoverageSummary";
import { DayColumn } from "@/components/coverage/DayColumn";
import styles from "@/components/coverage/coverage.module.css";
import { WeekNavigator } from "@/components/coverage/WeekNavigator";
import { ShiftRoster } from "@/components/shifts/ShiftRoster";
import { MissingRoleTags, RequirementTags } from "@/components/shifts/ShiftTags";
import { useWeekCoverage } from "@/hooks/useCoverage";
import { ApiRequestError } from "@/lib/api/client";
import { formatShiftWindow } from "@/lib/time/format";
import type { CoverageShift } from "@/modules/coverage/types";
import { spacing } from "@/theme";

function errorMessageFrom(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return "Coverage could not be loaded. Please try again.";
}

function Legend() {
  return (
    <div className={styles.legend}>
      <span className={styles.legendItem}>
        <span className={`${styles.dot} ${styles.dotFull}`} aria-hidden /> Fully staffed
      </span>
      <span className={styles.legendItem}>
        <span className={`${styles.dot} ${styles.dotPartial}`} aria-hidden /> Partially staffed
      </span>
      <span className={styles.legendItem}>
        <span className={`${styles.dot} ${styles.dotEmpty}`} aria-hidden /> Empty
      </span>
      <span className={styles.legendItem}>Chips show what is still missing (D / N / R).</span>
    </div>
  );
}

export function CoverageDashboard() {
  // undefined means "whatever week the server thinks today is in".
  const [weekStart, setWeekStart] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<CoverageShift | null>(null);

  const { data, isPending, isError, error, isFetching, refetch } = useWeekCoverage(weekStart);

  if (isPending) {
    return (
      <div className="surface-card">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Alert
        type="error"
        showIcon
        title="Could not load coverage"
        description={errorMessageFrom(error)}
        action={
          <Button size="small" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  const isCurrentWeek = data.today >= data.weekStart && data.today <= data.weekEnd;
  const hasShifts = data.totals.shifts > 0;
  const firstScheduled = data.dataRange.firstDate;

  return (
    <div style={{ display: "grid", gap: spacing.lg }}>
      <div className="surface-card" style={{ display: "grid", gap: spacing.md }}>
        <WeekNavigator
          weekStart={data.weekStart}
          weekEnd={data.weekEnd}
          isToday={isCurrentWeek}
          isFetching={isFetching}
          onChange={setWeekStart}
          onToday={() => setWeekStart(undefined)}
          onRefresh={() => refetch()}
        />
        <CoverageSummary totals={data.totals} />
        <Legend />
      </div>

      {!hasShifts && firstScheduled ? (
        <Alert
          type="info"
          showIcon
          title="No shifts scheduled this week"
          description={`The imported roster starts on ${dayjs(firstScheduled).format("D MMM YYYY")}.`}
          action={
            <Button size="small" onClick={() => setWeekStart(firstScheduled)}>
              Go to that week
            </Button>
          }
        />
      ) : null}

      <div className={styles.grid}>
        {data.days.map((day) => (
          <DayColumn key={day.date} day={day} today={data.today} onSelectShift={setSelected} />
        ))}
      </div>

      <Modal
        open={selected !== null}
        onCancel={() => setSelected(null)}
        footer={null}
        title={
          selected
            ? `${dayjs(selected.date).format("ddd D MMM YYYY")} · ${formatShiftWindow(selected)}`
            : undefined
        }
      >
        {selected ? (
          <div style={{ display: "grid", gap: spacing.sm }}>
            <div>
              <p className="type-caption" style={{ margin: `0 0 ${spacing.xxs}px` }}>
                Status
              </p>
              <span>{STATUS_LABEL[selected.status]}</span>
            </div>
            <div>
              <p className="type-caption" style={{ margin: `0 0 ${spacing.xxs}px` }}>
                Required
              </p>
              <RequirementTags requirements={selected.requirements} />
            </div>
            <div>
              <p className="type-caption" style={{ margin: `0 0 ${spacing.xxs}px` }}>
                Still missing
              </p>
              <MissingRoleTags missing={selected.missing} />
            </div>
            <div>
              <p className="type-caption" style={{ margin: `0 0 ${spacing.xxs}px` }}>
                On this shift
              </p>
              <ShiftRoster claims={selected.claims} />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
