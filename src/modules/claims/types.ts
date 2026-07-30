import type { ClaimStatus, Profession, RoleRequirements, StaffingStatus } from "@/types";
import type { ShiftRecord } from "@/modules/shifts/types";

export type ClaimSource = "self" | "manager";

export interface ClaimRecord {
  id: string;
  shiftId: string;
  userId: string;
  userName: string;
  userEmail: string;
  profession: Profession;
  status: ClaimStatus;
  source: ClaimSource;
  releaseReason?: string;
  createdAt: string;
}

/** A shift plus the roster of people on it, for the manager detail view. */
export interface ShiftWithClaims extends ShiftRecord {
  claims: ClaimRecord[];
}

/** What `GET /api/shifts` returns: roster plus whether the caller is on it. */
export interface ShiftListItem extends ShiftWithClaims {
  claimedByMe: boolean;
}

/** A claimed shift from the staff member's point of view. */
export interface MyShift {
  claimId: string;
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  startAt: string;
  endAt: string;
  profession: Profession;
  status: ClaimStatus;
  source: ClaimSource;
  releaseReason?: string;
  requirements: RoleRequirements;
  staffingStatus: StaffingStatus;
}

export interface ClaimShiftInput {
  shiftId: string;
  userId: string;
  actingUserId: string;
  source: ClaimSource;
}

export interface ReleaseClaimInput {
  shiftId: string;
  userId: string;
  reason?: string;
}

/** A claim dropped automatically because a manager's edit invalidated it. */
export interface ReleasedClaimSummary {
  claimId: string;
  userId: string;
  userName: string;
  profession: Profession;
  reason: string;
}
