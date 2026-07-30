# DECISIONS.md

Architectural and product decisions for the Clinic Shift Scheduler, with rationale and tradeoffs.

## 1. Next.js 16 + App Router

**Decision:** Use Next.js 16.2 with App Router, TypeScript 6.0, and Turbopack.

**Rationale:** Matches current LTS, React 19 support, and Vercel-first deployment. App Router gives server components for auth guards and thin API routes.

**Tradeoff:** Next 16 renamed `middleware.ts` → `proxy.ts` and removed `next lint`; we use ESLint directly.

---

## 2. MongoDB Atlas + Mongoose

**Decision:** MongoDB Atlas (user-provided URI) with Mongoose 9 and a global connection cache for serverless.

**Rationale:** Document model fits shifts, claims, and import audit rows. Atlas free tier is sufficient for the take-home demo.

**Tradeoff:** M0 has connection/ops limits (~500 connections, ~100 ops/sec) and auto-pauses after 30 days idle.

---

## 3. Auth.js v5 Credentials + JWT

**Decision:** Auth.js v5 (`next-auth@beta`) with Credentials provider and `session.strategy: "jwt"`.

**Rationale:** Credentials provider cannot use DB-backed sessions. JWT carries `role` and `profession` via callbacks — no DB hit per request for authorization checks.

**Tradeoff:** JWT invalidation requires short TTL or explicit session versioning (not needed for this scope).

---

## 4. Authorization outside proxy

**Decision:** `src/proxy.ts` only does optimistic cookie-based redirects. Real authorization is in `requireUser()` / `requireManager()` on every server entry point.

**Rationale:** Next.js 16 guidance and CVE-2025-29927 — proxy/middleware is not a reliable security boundary.

**Tradeoff:** Slightly more boilerplate, but auditable and testable.

---

## 5. Hybrid API + Server Actions

**Decision:** Thin REST handlers under `app/api/*` for domain operations; Server Actions reserved as optional form wrappers calling the same service layer.

**Rationale:** REST surface is curl-able for reviewers, services stay unit-testable, TanStack Query can poll `/api/*` endpoints.

**Tradeoff:** More files than actions-only approach.

---

## 6. Concurrency via transactions + version bumps

**Decision:** Claim mutations run in `session.withTransaction()`. Re-read shift counters, check overlap, then `$inc` `version` on both shift and user documents.

**Rationale:** Two concurrent claims on the same shift or overlapping claims by one staff member contend on shared documents → `WriteConflict` → automatic retry via callback API.

**Tradeoff:** Requires replica set (Atlas M0 is a 3-node replica set; local dev uses `docker compose` with `rs.initiate`).

---

## 7. Time modeling

**Decision:** Store clinic-local `date` + `startTime`/`endTime` strings, plus derived UTC `startAt`/`endAt`. Overnight shifts roll `endAt` to next day when `end <= start`.

**Rationale:** Matches messy CSV input (22:00–06:00, 16:00–00:00, `10:00+1`). Overlap uses half-open interval test.

**Tradeoff:** All display/formatting must respect `CLINIC_TIMEZONE`.

---

## 8. Editing claimed shifts

**Decision:** On time change, revalidate all active claims. Violating claims move to `status: "released"` with reason + audit record. Manager sees impact preview before save.

**Rationale:** Never silently drop staff from a shift they claimed in good faith.

**Tradeoff:** More UX work; staff may need to re-claim.

---

## 9. CSV import — merge conflicting rows

**Decision:** Natural key `(date, startAt, endAt)`. Duplicate windows with different requirements merge by taking **max per profession**, report as `merged`.

**Rationale:** Data shows systematic duplicates (5098 vs 5099, 5073 vs 5075). Merging avoids double-booking the same time slot.

**Alternative considered:** Keep as parallel shifts — rejected because it violates real-world semantics.

---

## 10. Import identity key

**Decision:** Email is the staff identity key. Repair `(at)` → `@`, trim whitespace, normalize roles to enum.

**Rationale:** Email is the only stable identifier across duplicate `staff_id` rows.

**Tradeoff:** Rows with missing/duplicate emails are rejected or merged with explicit report entries.

---

## 11. Realtime — polling first

**Decision:** TanStack Query polling + refetch-on-focus behind a pluggable `RealtimePort` interface. No WebSocket/SSE in Phase 0.

**Rationale:** Vercel serverless cannot hold long-lived WebSockets. M0 ops/sec cap makes aggressive polling risky.

**Tradeoff:** Updates are not instant; acceptable for MVP, documented for stretch goal.

---

## 12. Ant Design 6 + Framer dark design system

**Decision:** antd 6 with `@ant-design/nextjs-registry`, ConfigProvider `darkAlgorithm`, and a Framer-inspired token set (`docs/design.md` → `src/theme/tokens.ts` + CSS variables). Primary CTAs are white pills; `{colors.accent-blue}` is for links/focus only. Display type uses Geist Sans as the GT Walsheim substitute; body uses Inter with OpenType character variants.

**Rationale:** Keeps antd for tables/forms while matching the updated marketing-grade dark canvas. Tokens stay single-sourced so Phase 1–3 screens inherit the same surfaces, radii, and pill CTAs.

**Tradeoff:** Requires CSS overrides for antd primary buttons (white-on-black, not blue fills). No light mode — dark is the brand.

---

## 13. Barrels — per module, split client/server

**Decision:** One barrel per module. Auth split into `client.ts` (schemas) and `server.ts` (mongoose-dependent code).

**Rationale:** Prevents accidental mongoose bundling into client components (build failure we hit during scaffold).

---

## 14. Shared Atlas DB for local + production

**Decision:** Local `.env.local` and Vercel (prod/preview/dev) use the same MongoDB Atlas database (`atomiciabuild`). CI builds use a dummy URI (no live DB at build time).

**Rationale:** Simplifies the take-home demo — one data set for reviewers, no Docker dependency for day-to-day work.

**Tradeoff:** Local mutations affect production data. Acceptable for a demo; split databases before any shared staging with real users.

---

## 15. GitHub Actions owns CD (not Vercel Git auto-deploy)

**Decision:** `.github/workflows/ci.yml` runs quality checks, then production-only `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod` on push to `main`. No preview deploy job. `vercel.json` sets `git.deploymentEnabled: false`.

**Rationale:** Deploy only after typecheck/lint/test/build pass. Avoids double deploys and keeps CD simple for the take-home.

**Tradeoff:** Requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` GitHub secrets.

---

## 14. Shift duration bounds (30 minutes to 16 hours)

**Decision:** Reject shifts shorter than 30 minutes or longer than 16 hours.

**Rationale:** Overnight windows are stored by rolling the end into the next
day, which means _any_ end time parses as "valid" given enough rollover. The
legacy rows `15:00-09:00` (18h) and `12:00-12:00` (24h) would otherwise import
as real shifts. A duration bound is what actually distinguishes a night shift
from a data-entry error.

**Tradeoff:** A genuine 24-hour on-call shift would need the limit raised. The
bound lives in one constant (`MAX_SHIFT_MINUTES`) for that reason.

---

## 15. Unique natural key on (date, startAt, endAt)

**Decision:** A unique compound index enforces one shift per clinic time window.

**Rationale:** This is the database-level expression of decision 9. It makes the
importer's merge behaviour safe under retry, and stops the manager UI from
creating a second shift that overlaps an existing one exactly.

**Tradeoff:** A clinic that genuinely runs two independent teams in the same
window cannot model that as two shifts; they would need one shift with combined
requirements. Given the coverage dashboard is per-window, that is the better fit.

---

## 16. API routes excluded from the proxy matcher

**Decision:** `src/proxy.ts` matches page routes only; `/api/*` is excluded.

**Rationale:** The proxy redirects unauthenticated traffic to `/login`, which is
right for pages and wrong for an API — a fetch client got a `307` to an HTML
page instead of a JSON error. Route handlers already call
`requireUser()`/`requireManager()`, so excluding `/api` lets them answer with a
proper `401`/`403` envelope. This reinforces decision 4: the proxy is a UX
redirect, never the security boundary.

---

## 17. Concurrency: guarded counters plus a per-user conflict point

**Decision:** Claiming runs in a transaction that (a) bumps the claimant's own
user document, (b) increments the shift's filled counter with a conditional
`$expr` filter, and (c) inserts a claim protected by a partial-unique index.

**Rationale:** The two rules fail under load in different ways, so they need
different defences.

_Capacity_ is a single-document problem. The write itself re-checks
`filled < required`, so two simultaneous claimants cannot both match the filter.
This holds even without a transaction.

_Overlap_ is a multi-document problem, and this is the subtle one. MongoDB
transactions give **snapshot isolation, not serializability**. Two claims by the
same person for two different overlapping shifts each read a clean slate and
each write a different document, so nothing conflicts and both commit — a
classic write skew. Bumping the claimant's user document gives the two
transactions a shared document to fight over, which converts the skew into a
write conflict that `withTransaction` retries; the retry then sees the committed
first claim and rejects correctly.

**Tradeoff:** All of one person's claims serialize against each other. That is
irrelevant here (a human clicks one button at a time) and it is the cheapest
correct answer. Claims by _different_ people never contend.

**Verified:** `tests/integration/claims.test.ts` fires 8 simultaneous claims at
a one-slot shift and asserts exactly one winner, and 12 at a three-slot shift
asserting exactly three. It also submits two overlapping claims for one person
at the same instant and asserts one is refused.

---

## 18. Editing a claimed shift releases only what actually broke

**Decision:** After a manager edits a shift, every claim on it is re-checked
against the new shape. Claims that still satisfy capacity and overlap are kept;
the rest are released with a specific reason, and the manager sees exactly who
was dropped and why. Oldest claim wins when requirements shrink.

**Rationale:** The brief leaves this open. Releasing everyone is easy but
punishes people who did nothing wrong; keeping everyone silently breaks the
rules the rest of the system enforces. Re-validating is the only option that
keeps the invariant true without discarding valid work. Seniority by claim time
is the fair, explainable tiebreak.

**Tradeoff:** A staff member can lose a shift without acting. They see the
reason on _My shifts_, but a real clinic would need to notify them — see the
closing section.

---

## 19. Conflicting import rows merge by taking the higher count

**Decision:** Rows sharing `(date, startAt, endAt)` collapse into one shift
whose requirement per profession is the maximum across the rows, keeping every
source `shift_id` in `legacyShiftIds`.

**Rationale:** The spreadsheet disagrees with itself 27 times — rows 5098/5099
want the same window with different staffing, and Aug 4 and Aug 19 are
three-way disagreements. Understaffing a clinic is worse than overstaffing it,
so the maximum is the safe reading. Keeping the legacy ids means a manager can
trace any shift back to the rows it came from.

**Tradeoff:** A typo inflating a number propagates. The import report shows
every merge and the exact numbers it combined, so it is visible rather than
silent.

---

## 20. Date formats are disambiguated by separator

**Decision:** `YYYY-MM-DD` is ISO, `DD/MM/YYYY` for slashes, `MM-DD-YYYY` for
dashes. Every non-ISO reading is reported on the row.

**Rationale:** `05/08/2026` is genuinely ambiguous — 5 August or 8 May. The
dataset settles it: `29/08/2026` can only be day-first, and `08-13-2026` can
only be month-first, and each convention is used consistently with its
separator. Rather than hide that inference, each affected row states how it was
read so a manager can spot a wrong guess.

**Tradeoff:** A future export using US-style slashes would import silently
wrong. The report is the mitigation.

---

## 21. Imported staff share a documented password

**Decision:** Accounts created by the importer get the same password as the
seeded logins, applied with `$setOnInsert` so re-imports never overwrite one.

**Rationale:** The legacy spreadsheet has no credentials, but the brief needs
staff logins to be usable for review. A shared, documented password is the
honest option for a take-home.

**Tradeoff:** Unacceptable in production, where this should be an invite or
first-login reset. The password is also hardcoded in the seed rather than an
env var.

---

## 22. Live updates by polling

**Decision:** Shift views refetch every 15 seconds and on window focus.

**Rationale:** This is the "live updates" stretch goal. Polling needs no extra
infrastructure, survives serverless cold starts, and is enough for a clinic
where a slot fills every few minutes. `RealtimePort` exists so the transport can
be swapped for SSE or Pusher without touching the views.

**Tradeoff:** Up to 15 seconds stale, and a request per client per interval. A
socket would be better with more users.

---

## One thing I'd do differently with more time

**Tell people when they lose a shift.** Decision 18 lets a manager's edit
release someone's claim, and right now that person only finds out by opening
_My shifts_ and noticing it is gone. The release reason is already recorded on
the claim, so the data is there — what's missing is delivery: an email, or at
minimum an in-app inbox that surfaces released claims until acknowledged.

I would also revisit the release policy itself. Seniority is defensible but
arbitrary; a real clinic would want the manager to choose who stays, or to be
warned before saving rather than told afterwards. The current design optimizes
for keeping the data consistent, and quietly assumes someone else does the
human part. That is the weakest assumption in the system.
