import { clinicWeekDates, startOfClinicWeek, todayInClinic } from "@/lib/time/clinic";
import { listClaimsForShifts } from "@/modules/claims/claim.service";
import { buildWeekCoverage } from "@/modules/coverage/coverage.rules";
import type { WeekCoverage } from "@/modules/coverage/types";
import { getShiftDateRange, listShifts } from "@/modules/shifts/shift.service";

/**
 * Week-at-a-glance coverage. `weekStart` may be any date in the wanted week; it
 * is snapped to that week's Monday, so the client can pass a raw picker value
 * and never has to agree on where a week begins.
 */
export async function getWeekCoverage(weekStart?: string): Promise<WeekCoverage> {
  const today = todayInClinic();
  const dates = clinicWeekDates(startOfClinicWeek(weekStart ?? today));

  const [shifts, dataRange] = await Promise.all([
    listShifts({ from: dates[0], to: dates[6] }),
    getShiftDateRange(),
  ]);

  const claimsByShift = await listClaimsForShifts(shifts.map((shift) => shift.id));

  return buildWeekCoverage({ dates, shifts, claimsByShift, today, dataRange });
}
