import type { FilledCounts, RoleRequirements, StaffingStatus } from "@/types";

/**
 * Serialized shift shape returned by the API. Client-safe: this module must
 * never import Mongoose so components can share these types.
 */
export interface ShiftRecord {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  startAt: string;
  endAt: string;
  requirements: RoleRequirements;
  filled: FilledCounts;
  missing: RoleRequirements;
  status: StaffingStatus;
  legacyShiftIds: string[];
  version: number;
}

export interface CreateShiftInput {
  date: string;
  startTime: string;
  endTime: string;
  requirements: RoleRequirements;
}

export type UpdateShiftInput = Partial<CreateShiftInput>;

export interface ListShiftsParams {
  from?: string;
  to?: string;
}

export type CreateShiftPayload = CreateShiftInput;
export type UpdateShiftPayload = UpdateShiftInput;
