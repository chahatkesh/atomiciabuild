# Roadmap

Phased delivery for the Clinic Shift Scheduler take-home.

## Phase 0 — Scaffold ✓

- [x] Next.js 16 + TypeScript 6 + pnpm project
- [x] Layered folder structure with barrels
- [x] antd 6 shell + Framer dark design system (layout, theme, providers)
- [x] MongoDB connection + env validation
- [x] Auth.js v5 credentials login
- [x] Proxy route protection + server guards
- [x] `/api/health` with transaction probe
- [x] User seed script
- [x] Husky + commitlint + CI
- [x] docker-compose Mongo replica set
- [x] Vitest + time/overlap unit tests
- [x] Full documentation set
- [x] Placeholder pages (dashboard, shifts, my-shifts, imports)

## Phase 1 — Shift management ✓

- [x] Shift Mongoose model + indexes (incl. unique natural key on date + window)
- [x] `shift.rules.ts` — requirements parsing, duration limits, staffing status
- [x] `shift.service.ts` — CRUD with time normalization
- [x] API routes: `GET/POST /api/shifts`, `GET/PATCH/DELETE /api/shifts/[shiftId]`
- [x] Manager shifts page — table + create/edit modal + delete confirm
- [x] Shift edit impact warning (UI shell; release logic lands in Phase 2)
- [x] Zod schemas for shift input
- [x] TanStack Query hooks with cache invalidation
- [x] Unit tests for shift rules

**Exit criteria met.** Verified against MongoDB Atlas:

| Check                        | Result                                      |
| ---------------------------- | ------------------------------------------- |
| Create day shift 09:00–17:00 | 201, `startAt` 13:00Z (EDT)                 |
| Create overnight 22:00–06:00 | 201, `endAt` rolls to next day              |
| Duplicate date + window      | 409 `CONFLICT`                              |
| 18h window (15:00–09:00)     | 422 `VALIDATION_ERROR`                      |
| Identical start/end          | 422 "Start and end time cannot be the same" |
| Unauthenticated API call     | 401 JSON envelope                           |
| Staff create/delete          | 403 `FORBIDDEN`                             |
| Staff list shifts            | 200                                         |
| Unknown shift id             | 404                                         |

## Phase 2 — Claims + Import ✓

- [x] Claim model + partial-unique index on active claims
- [x] Transactional `claimService` (capacity + overlap + per-user serialization)
- [x] API routes for claim/unclaim
- [x] Staff "My Shifts" page with leave buttons
- [x] Manager direct assignment + remove from roster
- [x] Import normalizers (staff + shifts)
- [x] `runImport()` shared by seed and upload
- [x] Seed script for `docs/problem-statement/` CSVs (`pnpm seed`)
- [x] Manager CSV upload UI
- [x] Import Report page with row-level detail
- [x] Shift edit → claim revalidation + release
- [x] Integration tests for concurrent claims

**Exit criteria met.** Import results against the supplied CSVs:

| File         | Rows | Accepted | Repaired | Merged | Rejected | Written |
| ------------ | ---- | -------- | -------- | ------ | -------- | ------- |
| `staff.csv`  | 41   | 16       | 18       | 3      | 4        | 34      |
| `shifts.csv` | 117  | 35       | 50       | 27     | 5        | 85      |

Rejected staff rows: unknown role (Janitor), missing email, missing name, and an
email already belonging to a different person. Rejected shift rows: `2026-02-30`,
a 18h window, a 26h `+1` window, a missing start time, and a zero-length window.

Business rules verified end-to-end:

| Check                                        | Result                                |
| -------------------------------------------- | ------------------------------------- |
| 8 simultaneous claims, 1 nurse slot          | exactly 1 winner, `filled.nurse = 1`  |
| 12 simultaneous claims, 3 nurse slots        | exactly 3 winners                     |
| Overlapping claim                            | 409 with the clashing window named    |
| Two overlapping claims submitted at once     | exactly 1 accepted                    |
| Back-to-back shifts (16:00 end, 16:00 start) | both allowed                          |
| Profession the shift does not need           | rejected                              |
| Manager assign                               | same rules apply                      |
| Staff assigning someone else                 | 403                                   |
| Requirement lowered below claims             | newest released, oldest kept          |
| Shift time moved onto another claim          | that claim released                   |
| Shift deleted                                | claims released                       |
| Re-import                                    | idempotent; never lowers requirements |

## Phase 3 — Coverage dashboard

- [ ] `coverageService.getWeekCoverage()`
- [ ] `GET /api/coverage?weekStart=`
- [ ] Responsive week-at-a-glance grid
- [ ] Staffing status badges + missing role tags
- [ ] Week navigation (prev/next/jump)
- [ ] TanStack Query polling for live-ish updates

**Exit criteria:** Manager sees week coverage with missing roles; responsive on mobile.

## Stretch goals

| Goal             | Approach                               | Priority |
| ---------------- | -------------------------------------- | -------- |
| Recurring shifts | Series document + occurrence overrides | Low      |
| Live updates     | SSE or Pusher behind `RealtimePort`    | Low      |

## Estimated effort

| Phase   | Estimate   |
| ------- | ---------- |
| 0       | 1 day ✓    |
| 1       | 0.5–1 day  |
| 2       | 1.5–2 days |
| 3       | 0.5–1 day  |
| Stretch | 1+ day     |

Total: ~4 days (matches brief timeline).
