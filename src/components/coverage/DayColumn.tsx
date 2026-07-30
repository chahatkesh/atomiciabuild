"use client";

import dayjs from "dayjs";

import { CoverageShiftCard } from "@/components/coverage/CoverageShiftCard";
import styles from "@/components/coverage/coverage.module.css";
import type { CoverageShift, DayCoverage } from "@/modules/coverage/types";
import type { StaffingStatus } from "@/types";

const DOT_CLASS: Record<StaffingStatus, string> = {
  fully_staffed: styles.dotFull,
  partially_staffed: styles.dotPartial,
  empty: styles.dotEmpty,
};

interface DayColumnProps {
  day: DayCoverage;
  today: string;
  /** Hides fully staffed shifts. Day totals are unaffected — a covered shift
      contributes no open slots, so the header count stays true either way. */
  gapsOnly?: boolean;
  onSelectShift?: (shift: CoverageShift) => void;
}

export function DayColumn({ day, today, gapsOnly = false, onSelectShift }: DayColumnProps) {
  const date = dayjs(day.date);
  const isToday = day.date === today;
  const isPast = day.date < today;

  const classNames = [styles.day];
  if (isToday) {
    classNames.push(styles.dayToday);
  } else if (isPast) {
    classNames.push(styles.dayPast);
  }

  const unfilled = day.totals.required - day.totals.filled;
  const visible = gapsOnly
    ? day.shifts.filter((shift) => shift.status !== "fully_staffed")
    : day.shifts;

  return (
    <section className={classNames.join(" ")} aria-label={date.format("dddd, D MMMM YYYY")}>
      <header className={styles.dayHeader}>
        <span className={styles.weekday}>{date.format("ddd")}</span>
        <span className={styles.dayDate}>{isToday ? "Today" : date.format("D MMM")}</span>
      </header>

      {day.status ? (
        <span className={styles.dayMeta}>
          <span className={`${styles.dot} ${DOT_CLASS[day.status]}`} aria-hidden />
          {unfilled > 0 ? `${unfilled} slot${unfilled === 1 ? "" : "s"} open` : "Fully covered"}
        </span>
      ) : null}

      <div className={styles.shiftList}>
        {visible.length === 0 ? (
          <p className={styles.emptyDay}>
            {day.shifts.length === 0 ? "No shifts" : "Every shift covered"}
          </p>
        ) : (
          visible.map((shift) => (
            <CoverageShiftCard key={shift.id} shift={shift} onSelect={onSelectShift} />
          ))
        )}
      </div>
    </section>
  );
}
