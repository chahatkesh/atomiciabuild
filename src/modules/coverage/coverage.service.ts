import type { RoleRequirements, StaffingStatus } from "@/types";

export interface CoverageShiftSummary {
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: StaffingStatus;
  requirements: RoleRequirements;
  filled: RoleRequirements;
  missing: RoleRequirements;
}

export interface CoverageWeekSummary {
  weekStart: string;
  weekEnd: string;
  shifts: CoverageShiftSummary[];
}

export interface CoverageService {
  getWeekCoverage(weekStart: string): Promise<CoverageWeekSummary>;
}

export const coverageService: CoverageService = {
  async getWeekCoverage() {
    throw new Error("Not implemented: getWeekCoverage (Phase 3)");
  },
};
