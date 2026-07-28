import type { RoleRequirements, FilledCounts } from "@/types";

export interface ShiftRecord {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  startAt: Date;
  endAt: Date;
  requirements: RoleRequirements;
  filled: FilledCounts;
  legacyShiftIds: string[];
  version: number;
}

export interface CreateShiftInput {
  date: string;
  startTime: string;
  endTime: string;
  requirements: RoleRequirements;
}

export interface UpdateShiftInput extends Partial<CreateShiftInput> {
  id: string;
}

export interface ShiftService {
  listShifts(params?: { from?: string; to?: string }): Promise<ShiftRecord[]>;
  getShiftById(id: string): Promise<ShiftRecord | null>;
  createShift(input: CreateShiftInput): Promise<ShiftRecord>;
  updateShift(input: UpdateShiftInput): Promise<ShiftRecord>;
  deleteShift(id: string): Promise<void>;
}

export const shiftService: ShiftService = {
  async listShifts() {
    throw new Error("Not implemented: listShifts (Phase 1)");
  },
  async getShiftById() {
    throw new Error("Not implemented: getShiftById (Phase 1)");
  },
  async createShift() {
    throw new Error("Not implemented: createShift (Phase 1)");
  },
  async updateShift() {
    throw new Error("Not implemented: updateShift (Phase 1)");
  },
  async deleteShift() {
    throw new Error("Not implemented: deleteShift (Phase 1)");
  },
};
