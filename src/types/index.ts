export type UserRole = "manager" | "staff";

export type Profession = "doctor" | "nurse" | "receptionist";

export type ClaimStatus = "active" | "released";

export type ImportVerdict = "accepted" | "repaired" | "merged" | "rejected";

export type StaffingStatus = "fully_staffed" | "partially_staffed" | "empty";

export interface RoleRequirements {
  doctor: number;
  nurse: number;
  receptionist: number;
}

export interface FilledCounts {
  doctor: number;
  nurse: number;
  receptionist: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccessBody<T> {
  data: T;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  mongo: {
    connected: boolean;
    transactionsSupported: boolean;
  };
  timestamp: string;
}
