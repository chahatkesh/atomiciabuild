import type { ClaimRecord } from "@/modules/claims/types";
import type { ShiftRecord } from "@/modules/shifts/types";
import type { RoleRequirements, StaffingStatus } from "@/types";

/** A shift in the week grid, with the roster attached for the hover detail. */
export interface CoverageShift extends ShiftRecord {
  claims: ClaimRecord[];
}

export interface CoverageTotals {
  shifts: number;
  fullyStaffed: number;
  partiallyStaffed: number;
  empty: number;
  /** Unfilled slots per profession, summed. Drives "which roles are missing". */
  missing: RoleRequirements;
  required: number;
  filled: number;
}

export interface DayCoverage {
  date: string;
  /** Present even with no shifts, so the grid always renders a full week. */
  shifts: CoverageShift[];
  totals: CoverageTotals;
  /** Worst status among the day's shifts, or null when the day is free. */
  status: StaffingStatus | null;
}

/**
 * The span of dates that actually have shifts. The imported roster sits in
 * August 2026, so the current week is often empty; this lets the empty state
 * offer a one-click jump to real data instead of a dead end.
 */
export interface CoverageDataRange {
  firstDate: string | null;
  lastDate: string | null;
}

export interface WeekCoverage {
  weekStart: string;
  weekEnd: string;
  days: DayCoverage[];
  totals: CoverageTotals;
  /** Clinic-local today, so the client highlights the right column. */
  today: string;
  dataRange: CoverageDataRange;
}
