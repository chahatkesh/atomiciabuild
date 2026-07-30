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

## Phase 3 — Coverage dashboard ✓

- [x] Monday-based week helpers in `lib/time/clinic` (`startOfClinicWeek`, `clinicWeekDates`)
- [x] `coverage.rules.ts` — pure per-day/per-week aggregation
- [x] `coverage.service.ts` — `getWeekCoverage()` over shifts + claims
- [x] `GET /api/coverage?weekStart=` with query validation
- [x] Responsive week-at-a-glance grid (7 → 4 → 2 → 1 columns)
- [x] Per-shift status stripe + missing-role chips; per-day worst-status dot
- [x] Week summary stats + coverage progress bar
- [x] Week navigation: prev / next / this week / jump to any date
- [x] Shift detail modal with roster, requirements, and what is missing
- [x] `dataRange` empty state — one click to a week that has shifts
- [x] TanStack Query polling (15s) + refetch on focus, previous week kept while loading
- [x] Unit tests for week bounds and coverage aggregation

**Exit criteria met.** Verified against MongoDB Atlas (85 imported shifts, one
claim per week held by a staff account):

| Week (Mon–Sun)  | Shifts | Full | Partial | Empty | Slots | Free days |
| --------------- | ------ | ---- | ------- | ----- | ----- | --------- |
| Jul 27 – Aug 2  | 0      | 0    | 0       | 0     | 0/0   | 7         |
| Aug 3 – Aug 9   | 23     | 0    | 4       | 19    | 4/75  | 0         |
| Aug 10 – Aug 16 | 20     | 0    | 0       | 20    | 0/80  | 0         |
| Aug 17 – Aug 23 | 19     | 0    | 0       | 19    | 0/82  | 0         |
| Aug 24 – Aug 30 | 23     | 0    | 0       | 23    | 0/85  | 0         |
| Aug 31 – Sep 6  | 0      | 0    | 0       | 0     | 0/0   | 7         |

23 + 20 + 19 + 23 = **85**, matching the shift count in the database: every shift
lands in exactly one week, with no double-counting across week boundaries.

Behaviour verified:

| Check                                    | Result                                     |
| ---------------------------------------- | ------------------------------------------ |
| `weekStart` mid-week (`2026-08-27`)      | snaps to Monday `2026-08-24`               |
| `weekStart` on a Sunday (`2026-08-09`)   | resolves to the week starting `2026-08-03` |
| `weekStart` omitted                      | week containing clinic-local today         |
| `weekStart=nope`                         | 400 `BAD_REQUEST`                          |
| Week with no shifts                      | 7 empty day columns + jump-to-data prompt  |
| Overnight shift (16:00–00:00)            | listed on its start date only              |
| Day with one partial and one empty shift | day dot shows the worse status (empty)     |
| Staff account reading `/api/coverage`    | 200 (dashboard serves both roles)          |
| Claim made on Shifts page                | dashboard reflects it within one poll      |

## Stretch goals

| Goal             | Approach                               | Priority |
| ---------------- | -------------------------------------- | -------- |
| Recurring shifts | Series document + occurrence overrides | Low      |
| Live updates     | SSE or Pusher behind `RealtimePort`    | Low      |

## Estimated effort

| Phase   | Estimate     |
| ------- | ------------ |
| 0       | 1 day ✓      |
| 1       | 0.5–1 day ✓  |
| 2       | 1.5–2 days ✓ |
| 3       | 0.5–1 day ✓  |
| Stretch | 1+ day       |

Total: ~4 days (matches brief timeline).
