# DECISIONS.md

Architectural and product decisions for the Clinic Shift Scheduler, with rationale and tradeoffs.

Numbered in the order they were taken, and never renumbered — the code and the other
docs cite them by number. **1–15 are one-liners**: stack choices made while
scaffolding. **16–33 are the ones with real tradeoffs**, written as they came up.

Nobody needs to read all of it. Pick from the index, or start with these five.

## If you only read five

- **[19 — Guarded counters and a per-user conflict point](#19-concurrency-guarded-counters-plus-a-per-user-conflict-point)** —
  MongoDB transactions give snapshot isolation, not serializability, so two
  overlapping claims by one person both commit. The fix, and the test that fires
  eight claims at one slot to prove it.
- **[20 — Editing a claimed shift releases only what broke](#20-editing-a-claimed-shift-releases-only-what-actually-broke)** —
  the brief leaves this open. Releasing everyone is easy and punishes people who did
  nothing wrong.
- **[22 — Date formats are disambiguated by separator](#22-date-formats-are-disambiguated-by-separator)** —
  `05/08/2026` is genuinely ambiguous until you notice the spreadsheet uses each
  separator consistently. Every inference is reported on the row.
- **[4 — Authorization lives outside the proxy](#4-authorization-outside-proxy)** —
  why middleware is a UX redirect and never the security boundary (CVE-2025-29927).
- **[33 — The app's own URL is never trusted](#33-the-apps-own-url-is-resolved-defensively-never-trusted)** —
  one schemeless environment variable failed the build and 500'd every route.
  Configuration is input too.

## Index

**Stack and structure** — [1 Next.js 16 + App Router](#1-nextjs-16-app-router) ·
[2 MongoDB Atlas + Mongoose](#2-mongodb-atlas-mongoose) ·
[5 Hybrid API + server actions](#5-hybrid-api-server-actions) ·
[12 antd 6 + a dark design system](#12-ant-design-6-framer-dark-design-system) ·
[13 Split client/server barrels](#13-barrels-per-module-split-clientserver) ·
[32 The shell owns the page heading](#32-the-shell-owns-the-page-heading)

**Auth and access** — [3 Credentials + JWT sessions](#3-authjs-v5-credentials-jwt) ·
[4 Authorization outside the proxy](#4-authorization-outside-proxy) ·
[18 API and metadata image routes excluded](#18-api-and-metadata-image-routes-excluded-from-the-proxy-matcher) ·
[23 A documented demo password](#23-imported-staff-share-a-documented-password)

**Correct under load** — [6 Transactions + version bumps](#6-concurrency-via-transactions-version-bumps) ·
[8 Editing claimed shifts](#8-editing-claimed-shifts) ·
[19 Guarded counters + a per-user conflict point](#19-concurrency-guarded-counters-plus-a-per-user-conflict-point) ·
[20 Release only what broke](#20-editing-a-claimed-shift-releases-only-what-actually-broke)

**Time and the data model** — [7 Clinic-local strings + derived instants](#7-time-modeling) ·
[16 Duration bounds](#16-shift-duration-bounds-30-minutes-to-16-hours) ·
[17 Unique natural key](#17-unique-natural-key-on-date-startat-endat) ·
[25 Weeks run Monday to Sunday](#25-weeks-run-monday-to-sunday-and-the-server-decides) ·
[30 Format from local strings, not instants](#30-shift-windows-are-formatted-from-clinic-local-strings-not-instants)

**The messy CSV** — [9 Merge conflicting rows](#9-csv-import-merge-conflicting-rows) ·
[10 Email is the identity key](#10-import-identity-key) ·
[21 Merge by the higher count](#21-conflicting-import-rows-merge-by-taking-the-higher-count) ·
[22 Dates disambiguated by separator](#22-date-formats-are-disambiguated-by-separator)

**Coverage dashboard** — [26 A date picker, not a week picker](#26-jump-to-week-is-a-date-picker-not-a-week-picker) ·
[27 A day's status is its worst shift](#27-a-days-status-is-its-worst-shift) ·
[28 One page, two default lenses](#28-one-coverage-page-for-both-roles-with-a-different-default-lens) ·
[29 Empty weeks offer a way out](#29-empty-weeks-offer-a-way-out) ·
[31 Aggregation is a pure function](#31-coverage-aggregation-is-a-pure-function)

**Running it** — [11 Polling behind a RealtimePort](#11-realtime-polling-first) ·
[14 One shared Atlas database](#14-shared-atlas-db-for-local-production) ·
[15 CI owns deployment](#15-github-actions-owns-cd-not-vercel-git-auto-deploy) ·
[24 15-second polling](#24-live-updates-by-polling) ·
[33 The app's URL is never trusted](#33-the-apps-own-url-is-resolved-defensively-never-trusted)

And the honest weak spot:
[one thing I'd do differently with more time](#one-thing-id-do-differently-with-more-time).

---

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

**Decision:** On time change, revalidate all active claims. Violating claims move to `status: "released"` with reason + audit record. The edit form warns before saving that a shift already has claims; the response then names exactly who was released and why.

**Rationale:** Never silently drop staff from a shift they claimed in good faith.

**Tradeoff:** The warning is generic — it cannot name who _would_ be dropped without running the revalidation twice. Staff may need to re-claim. See decision 20 for the release policy.

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

## 16. Shift duration bounds (30 minutes to 16 hours)

**Decision:** Reject shifts shorter than 30 minutes or longer than 16 hours.

**Rationale:** Overnight windows are stored by rolling the end into the next
day, which means _any_ end time parses as "valid" given enough rollover. The
legacy rows `15:00-09:00` (18h) and `12:00-12:00` (24h) would otherwise import
as real shifts. A duration bound is what actually distinguishes a night shift
from a data-entry error.

**Tradeoff:** A genuine 24-hour on-call shift would need the limit raised. The
bound lives in one constant (`MAX_SHIFT_MINUTES`) for that reason.

---

## 17. Unique natural key on (date, startAt, endAt)

**Decision:** A unique compound index enforces one shift per clinic time window.

**Rationale:** This is the database-level expression of decision 9. It makes the
importer's merge behaviour safe under retry, and stops the manager UI from
creating a second shift that overlaps an existing one exactly.

**Tradeoff:** A clinic that genuinely runs two independent teams in the same
window cannot model that as two shifts; they would need one shift with combined
requirements. Given the coverage dashboard is per-window, that is the better fit.

---

## 18. API and metadata image routes excluded from the proxy matcher

**Decision:** `src/proxy.ts` matches page routes only; `/api/*`,
`/opengraph-image`, and `/twitter-image` are excluded.

**Rationale:** The proxy redirects unauthenticated traffic to `/login`, which is
right for pages and wrong for an API — a fetch client got a `307` to an HTML
page instead of a JSON error. Route handlers already call
`requireUser()`/`requireManager()`, so excluding `/api` lets them answer with a
proper `401`/`403` envelope. The same trap hit the file-based OG/Twitter image
routes: crawlers follow `og:image` without a session and must receive a PNG, not
a login redirect. This reinforces decision 4: the proxy is a UX redirect, never
the security boundary.

---

## 19. Concurrency: guarded counters plus a per-user conflict point

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

## 20. Editing a claimed shift releases only what actually broke

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

## 21. Conflicting import rows merge by taking the higher count

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

## 22. Date formats are disambiguated by separator

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

## 23. Imported staff share a documented password

**Decision:** Accounts created by the importer get the same password as the
seeded logins, applied with `$setOnInsert` so re-imports never overwrite one.

**Rationale:** The legacy spreadsheet has no credentials, but the brief needs
staff logins to be usable for review. A shared, documented password is the
honest option for a take-home.

The login page also offers one-click sign-in as a manager, a nurse, or a doctor.
Since the credentials are published in the README regardless, putting them behind
a copy-paste step protects nothing and only costs the reviewer time.

**Tradeoff:** Unacceptable in production, where this should be an invite or
first-login reset, and where the demo block would have to go. The password is
also hardcoded in the seed rather than read from an env var.

---

## 24. Live updates by polling

**Decision:** Shift views refetch every 15 seconds and on window focus.

**Rationale:** This is the "live updates" stretch goal. Polling needs no extra
infrastructure, survives serverless cold starts, and is enough for a clinic
where a slot fills every few minutes. `RealtimePort` exists so the transport can
be swapped for SSE or Pusher without touching the views.

**Tradeoff:** Up to 15 seconds stale, and a request per client per interval. A
socket would be better with more users.

---

## 25. Weeks run Monday to Sunday, and the server decides

**Decision:** A week is Monday–Sunday. `GET /api/coverage?weekStart=` accepts
_any_ date in the wanted week and snaps it to that week's Monday server-side.

**Rationale:** Two things had to agree on where a week begins — the grid and the
query — and putting that rule in one place on the server means they cannot drift.
It also makes the endpoint forgiving: the date picker can hand over whatever the
user clicked. Monday-first matches how a clinic rota reads and the brief's own
"every Mon/Wed" example.

**Tradeoff:** A clinic that runs Sunday-first weeks needs a config value. The
rule is one function (`startOfClinicWeek`), so that is a small change.

---

## 26. Jump-to-week is a date picker, not a week picker

**Decision:** The "jump to any week" control is an ordinary date picker; whatever
date is chosen, the week containing it is shown.

**Rationale:** antd's `picker="week"` labels weeks by ISO number ("2026-32nd"),
and its week boundaries follow the antd locale rather than decision 25 — so it
could highlight a different week than the one rendered. Nobody thinks in week
numbers anyway; they think "the week of the 10th". Picking a date has no such
mismatch and needs no locale configuration.

**Tradeoff:** One extra click to see which dates a week covers. The heading
("3 – 9 Aug 2026") answers that immediately.

---

## 27. A day's status is its worst shift

**Decision:** Each day column shows one status dot: red if any shift on it is
empty, amber if any is partially staffed, green only if all are covered. Per-shift
status stays visible as a coloured stripe on each card.

**Rationale:** The dashboard exists to make gaps findable. Averaging would hide
the one empty night shift behind three full day shifts, which is precisely the
thing a manager is scanning for. Pessimistic roll-up means a green day is
trustworthy.

**Tradeoff:** A day that is 90% staffed looks as alarming as an empty one at the
day level. The per-shift stripes and the "N slots open" count give the detail,
so the dot is a "look here" signal rather than a score.

---

## 28. One coverage page for both roles, with a different default lens

**Decision:** `GET /api/coverage` and `/dashboard` require a signed-in user, not
a manager. Both roles get the same component and the same data. What differs is
the **default lens**: a manager lands on _All shifts_, a staff member lands on
_Needs staff_, which hides fully staffed shifts. Either role can switch. All
management actions stay manager-only.

**Rationale:** The brief calls this a manager view, and for managers it is. But
the dashboard is the app's landing page for both roles, and a staff member seeing
which shifts are short is exactly what prompts them to claim one — the shortage
information is the same information the Shifts page already shows them. Hiding it
would cost a real workflow to protect nothing.

The lens is what makes one page honestly serve two intents. A manager is auditing
the week and needs to see the covered shifts to trust the green ones; a staff
member is scanning for somewhere to be useful, and every covered shift is noise.
Two separate pages would have duplicated the grid, the week navigation, and the
aggregation to express a difference that is really just a filter.

Filtering is client-side and deliberately does not touch the day totals: a fully
staffed shift contributes zero open slots, so "3 slots open" reads the same with
the covered shifts hidden. The week summary above the grid always describes the
whole week, which is what a summary should do.

**Tradeoff:** Staff can see clinic-wide staffing levels. If that were sensitive,
the fix is a narrowed response (counts without rosters) rather than a blanket 403.

---

## 29. Empty weeks offer a way out

**Decision:** The coverage response carries `dataRange` (first and last scheduled
date). When a week has no shifts, the page says where the roster actually starts
and offers one click to that week.

**Rationale:** The imported roster covers August 2026, so anyone opening the
dashboard before then lands on a legitimately empty week. Without this, the first
impression of the feature is a blank grid that looks broken. Two extra indexed
queries turn a dead end into a signpost.

**Tradeoff:** Two more queries per request. They hit the existing `date` index and
sort-limit to one document each, so the cost is negligible.

---

## 30. Shift windows are formatted from clinic-local strings, not instants

**Decision:** `formatShiftWindow()` decides whether a shift crosses midnight
from the stored `startTime`/`endTime` strings, and never from `startAt`/`endAt`.

**Rationale:** Building the coverage cards needed a third copy of this
formatter, so I extracted the two that already existed — and the extracted
version had a bug. It compared the UTC instants with `dayjs(...).isSame(day)`,
which resolves in the **browser's** timezone. Viewed from UTC+5:30, a 14:00–22:00
Toronto shift becomes 23:30–07:30 and picks up a "(+1)" it should never have; the
same shift looks correct to a viewer in Toronto. The clinic-local strings carry no
timezone, so comparing those is right for every viewer.

A shift crosses midnight when its end carries a later `+1` day marker than its
start, or when both sit on the same day and the end time is at or before the start
time (which is exactly the condition that made `buildShiftWindow` roll the window
forward in the first place).

**Tradeoff:** The formatter now trusts that `endTime <= startTime` always means a
rolled window. That is guaranteed by `buildShiftWindow`, and the unique natural
key (decision 17) means no shift can exist that violates it.
`tests/unit/shift-window.test.ts` pins the behaviour, and the full suite passes
under `TZ=Asia/Kolkata` as well as the clinic timezone.

---

## 31. Coverage aggregation is a pure function

**Decision:** `coverage.rules.ts` holds the grouping and roll-up logic as a pure
function; `coverage.service.ts` does the database reads and calls it. Component
styling for the grid lives in a CSS module rather than inline styles.

**Rationale:** The aggregation is where the interesting rules are — day
assignment for overnight shifts, worst-status roll-up, clamped totals — and all
of it is testable without a database. That is why the coverage tests run as unit
tests instead of integration tests. The CSS module is there because the responsive
column counts need media queries, which inline styles cannot express.

**Tradeoff:** One more file per concern, and one styling approach (CSS modules)
that the rest of the app does not yet use.

---

## 32. The shell owns the page heading

**Decision:** `AppShell` renders the only `<h1>` on every page, from a
route-to-copy map that takes the role and the user's first name. Pages render
content, never their own title.

**Rationale:** The dashboard had grown a second `<h1>` beside the shell's, so the
page announced itself twice and the two could drift — the nav said "Coverage"
while the page said "Where you're needed". Putting the map in the shell means the
nav label, the heading and the subtitle are written in one place and cannot
disagree, and every route gets a one-line explanation of what it is for instead
of only the dashboard having one.

**Tradeoff:** Page copy lives away from the page. Worth it for four routes; a
larger app would want each page to export its own header metadata.

---

## 33. The app's own URL is resolved defensively, never trusted

**Decision:** `resolveAppOrigin()` derives the origin for absolute metadata from
`AUTH_URL`, then the Vercel-provided hosts, then a canonical constant, and it
cannot throw. `parseHttpUrl()` repairs the two forms a platform actually stores —
a bare host with no scheme, a value that kept its quotes — and returns null for
anything else. The auth entry module repairs `AUTH_URL` in `process.env` before
any request can read it.

**Rationale:** A production deploy had `AUTH_URL` set to a host with no scheme, and
that one-character mistake took down two things at once. `next build` failed while
collecting page data for `/_not-found`, because `metadataBase: new URL(...)` runs
when the root layout module is evaluated — and the platform redacted the value as
`[SENSITIVE]`, so the error named an unrelated route and pointed nowhere. Every
route then 500s at runtime, verified with `next start`: `next-auth` re-reads
`AUTH_URL` per request in `reqWithEnvURL()` and calls `new URL()` on it unguarded,
and `src/proxy.ts` puts that on the path of every page request.

Configuration is input, and this input comes from a dashboard nobody type-checks, so
the importer's rule applies: repair what is unambiguous, drop what is not, never
crash. A missing scheme is unambiguous — `VERCEL_URL` never carries one. Dropping an
unrepairable value is the safe direction because `trustHost` is set, so Auth.js
falls back to the request headers, which is what you want on Vercel anyway.

**Tradeoff:** A malformed `AUTH_URL` is corrected silently rather than reported. The
louder options were failing the build or 500-ing every request, and neither names
the offending variable; nothing reads `getEnv().AUTH_URL`, so strict validation
there bought an outage and nothing else. `tests/unit/app-url.test.ts` pins the
fallback order and the repairs.

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
