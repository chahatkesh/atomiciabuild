export const APP_NAME = "Clinic Shift Scheduler";

export const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  shifts: "/shifts",
  myShifts: "/my-shifts",
  imports: "/imports",
  coverage: "/dashboard",
} as const;

export const PROFESSIONS = ["doctor", "nurse", "receptionist"] as const;

export const USER_ROLES = ["manager", "staff"] as const;

export const DEFAULT_CLINIC_TIMEZONE = "America/Toronto";

export const QUERY_KEYS = {
  health: ["health"] as const,
  shifts: ["shifts"] as const,
  myShifts: ["my-shifts"] as const,
  coverage: ["coverage"] as const,
  importRuns: ["import-runs"] as const,
  importRun: ["import-run"] as const,
  staffDirectory: ["staff-directory"] as const,
} as const;

/**
 * Poll interval for shift data. The brief's "live updates" stretch goal is met
 * by polling rather than sockets: it survives serverless cold starts and needs
 * no extra infrastructure. See DECISIONS.md.
 */
export const LIVE_POLL_INTERVAL_MS = 15_000;
