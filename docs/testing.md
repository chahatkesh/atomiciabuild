# Testing

## Runner

Vitest 4 with Node environment.

```bash
pnpm test          # single run — unit + integration
pnpm test:watch    # watch mode
```

Config: `vitest.config.ts` — also parses `.env.local` so integration specs can
reach the cluster.
Setup: `tests/setup.ts` (fallback env vars when no `.env.local` exists).

## Coverage

**79 tests across 6 files.**

| File                                  | What it covers                                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `tests/unit/clinic-time.test.ts`      | Date parsing (ISO, dd/MM, MM-dd), `+1` times, overnight windows, overlap detection                          |
| `tests/unit/shift-rules.test.ts`      | Requirement parsing, duration bounds, staffing status, capacity maths                                       |
| `tests/unit/staff-normalizer.test.ts` | Role aliases, `(at)` email repair, rejection of unknown roles and missing identity fields                   |
| `tests/unit/shift-normalizer.test.ts` | Date convention inference, overnight/midnight/`+1` handling, free-text requirements, every rejection reason |
| `tests/integration/claims.test.ts`    | Concurrency, overlap, capacity, release/re-claim, edit revalidation, delete cascade                         |
| `tests/integration/import.test.ts`    | Merge policy, duplicate identity handling, imported logins, idempotency, row reports                        |

## Integration tests

They connect to `MONGODB_URI` (or `MONGODB_URI_TEST` if set) but **always
override the database name** to `clinic_scheduler_integration_test`. Seeded
application data is therefore never at risk, even when `MONGODB_URI` points at
a live cluster.

If neither variable resolves to a real cluster, the suites skip via
`describe.skipIf(!hasIntegrationDb)` rather than failing — this is what keeps CI
green without a database service.

Transactions are required, so the target must be a replica set or Atlas.
`fileParallelism` is off because the integration files share one database.

### The concurrency tests

These are the reason the integration layer exists. The brief requires a shift's
availability to stay accurate "no matter how many people are acting on it at
once", and that is not observable from unit tests.

```typescript
const results = await Promise.allSettled(
  nurses.map((userId) =>
    claimShift({ shiftId: shift.id, userId, actingUserId: userId, source: "self" }),
  ),
);

expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
expect(await filledNurses(shift.id)).toBe(1);
```

Covered races:

- 8 claimants, 1 slot → exactly 1 winner; the other 7 get a 409 with a real message
- 12 claimants, 3 slots → exactly 3 winners
- One person submitting two overlapping claims simultaneously → exactly 1 accepted

That last case is the write-skew scenario described in DECISIONS.md §17, and it
fails without the per-user conflict point.

## Unit test guidelines

- Pure functions in `*.rules.ts` and `*.normalizer.ts` — no DB, no mocks
- Time tests use a fixed `CLINIC_TIMEZONE=America/Toronto`
- Normalizer tests use real rows from `docs/problem-statement/*.csv`

## CI

GitHub Actions runs `pnpm test` on every push and PR. There is no MongoDB
service container, so integration specs skip and unit specs run. To exercise the
full suite in CI, add a replica-set service and set `MONGODB_URI_TEST`.

## What to test for each feature

| Feature    | Must test                                                   |
| ---------- | ----------------------------------------------------------- |
| Claim      | Capacity rejection, overlap rejection, concurrent last slot |
| Import     | Each dirty row category from import-pipeline.md             |
| Shift edit | Claim release on time change and on shrinking requirements  |
| Auth       | Role guard returns 403                                      |
