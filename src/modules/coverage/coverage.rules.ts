import { PROFESSIONS } from "@/constants";
import type { ClaimRecord } from "@/modules/claims/types";
import type {
  CoverageDataRange,
  CoverageShift,
  CoverageTotals,
  DayCoverage,
  WeekCoverage,
} from "@/modules/coverage/types";
import type { ShiftRecord } from "@/modules/shifts/types";
import type { StaffingStatus } from "@/types";

export function emptyCoverageTotals(): CoverageTotals {
  return {
    shifts: 0,
    fullyStaffed: 0,
    partiallyStaffed: 0,
    empty: 0,
    missing: { doctor: 0, nurse: 0, receptionist: 0 },
    required: 0,
    filled: 0,
  };
}

function accumulate(totals: CoverageTotals, shift: CoverageShift): void {
  totals.shifts += 1;

  if (shift.status === "fully_staffed") {
    totals.fullyStaffed += 1;
  } else if (shift.status === "partially_staffed") {
    totals.partiallyStaffed += 1;
  } else {
    totals.empty += 1;
  }

  for (const profession of PROFESSIONS) {
    totals.missing[profession] += shift.missing[profession];
    totals.required += shift.requirements[profession];
    // Filled is clamped to what was required so the week percentage cannot
    // exceed 100 if a roster is ever repaired by hand.
    totals.filled += Math.min(shift.filled[profession], shift.requirements[profession]);
  }
}

/**
 * A day's headline status is its worst shift: one empty shift matters more to a
 * manager scanning the week than three fully staffed ones beside it.
 */
export function worstStatus(shifts: Array<{ status: StaffingStatus }>): StaffingStatus | null {
  if (shifts.length === 0) {
    return null;
  }
  if (shifts.some((shift) => shift.status === "empty")) {
    return "empty";
  }
  if (shifts.some((shift) => shift.status === "partially_staffed")) {
    return "partially_staffed";
  }
  return "fully_staffed";
}

export interface BuildWeekCoverageInput {
  /** The seven dates of the week, in order. */
  dates: string[];
  shifts: ShiftRecord[];
  claimsByShift: Record<string, ClaimRecord[]>;
  today: string;
  dataRange: CoverageDataRange;
}

/**
 * Groups shifts into the week grid and rolls up per-day and week totals. Pure,
 * so the aggregation can be tested without a database.
 *
 * Shifts are keyed by their start date, so an overnight shift appears on the day
 * it begins — the day someone turns up for it.
 */
export function buildWeekCoverage({
  dates,
  shifts,
  claimsByShift,
  today,
  dataRange,
}: BuildWeekCoverageInput): WeekCoverage {
  const byDate = new Map<string, CoverageShift[]>(dates.map((date) => [date, []]));

  for (const shift of shifts) {
    byDate.get(shift.date)?.push({ ...shift, claims: claimsByShift[shift.id] ?? [] });
  }

  const weekTotals = emptyCoverageTotals();

  const days: DayCoverage[] = dates.map((date) => {
    const dayShifts = (byDate.get(date) ?? []).sort((a, b) => a.startAt.localeCompare(b.startAt));
    const totals = emptyCoverageTotals();

    for (const shift of dayShifts) {
      accumulate(totals, shift);
      accumulate(weekTotals, shift);
    }

    return { date, shifts: dayShifts, totals, status: worstStatus(dayShifts) };
  });

  return {
    weekStart: dates[0],
    weekEnd: dates[dates.length - 1],
    days,
    totals: weekTotals,
    today,
    dataRange,
  };
}
