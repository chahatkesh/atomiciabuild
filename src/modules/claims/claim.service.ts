import type { ClaimStatus, Profession } from "@/types";

export interface ClaimRecord {
  id: string;
  shiftId: string;
  staffId: string;
  profession: Profession;
  status: ClaimStatus;
  releaseReason?: string;
}

export interface ClaimShiftInput {
  shiftId: string;
  staffId: string;
  profession: Profession;
  assignedByManager?: boolean;
}

export interface ClaimService {
  claimShift(input: ClaimShiftInput): Promise<ClaimRecord>;
  unclaimShift(shiftId: string, staffId: string): Promise<void>;
  listClaimsForShift(shiftId: string): Promise<ClaimRecord[]>;
  listClaimsForStaff(staffId: string): Promise<ClaimRecord[]>;
}

export const claimService: ClaimService = {
  async claimShift() {
    throw new Error("Not implemented: claimShift (Phase 2)");
  },
  async unclaimShift() {
    throw new Error("Not implemented: unclaimShift (Phase 2)");
  },
  async listClaimsForShift() {
    throw new Error("Not implemented: listClaimsForShift (Phase 2)");
  },
  async listClaimsForStaff() {
    throw new Error("Not implemented: listClaimsForStaff (Phase 2)");
  },
};
