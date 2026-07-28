# Testing

## Runner

Vitest 4 with Node environment.

```bash
pnpm test          # single run
pnpm test:watch    # watch mode
```

Config: `vitest.config.ts`  
Setup: `tests/setup.ts` (injects test env vars)

## Current coverage (Phase 0)

| File                             | Tests                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `tests/unit/clinic-time.test.ts` | Date parsing (ISO, dd/MM, MM-dd), time parsing (+1), overnight windows, overlap detection |

## Test categories (planned)

| Category                        | Tool                  | Phase |
| ------------------------------- | --------------------- | ----- |
| Unit — pure rules               | Vitest                | 0–2   |
| Unit — import normalizers       | Vitest                | 2     |
| Integration — claim concurrency | Vitest + MongoDB      | 2     |
| E2E — login + claim flow        | Playwright (optional) | 3     |

## Unit test guidelines

- Pure functions in `*.rules.ts` — no DB, no mocks needed
- Time tests use fixed `CLINIC_TIMEZONE=America/Toronto` from setup
- Import normalizer tests use rows from `problem-statement/*.csv`

## Integration test setup (future)

```bash
docker compose up -d
MONGODB_URI=mongodb://127.0.0.1:27017/clinic-scheduler-test?replicaSet=rs0 pnpm test:integration
```

Parallel claim tests:

```typescript
await Promise.all([
  claimService.claimShift({ shiftId, staffId: nurse1, profession: "nurse" }),
  claimService.claimShift({ shiftId, staffId: nurse2, profession: "nurse" }),
  claimService.claimShift({ shiftId, staffId: nurse3, profession: "nurse" }),
]);
// Assert exactly 2 succeed when requirements.nurse === 2
```

## CI

GitHub Actions runs `pnpm test` on every push/PR. No MongoDB service in CI for Phase 0 (unit tests only). Phase 2 adds MongoDB service container for integration tests.

## What to test for each feature

| Feature    | Must test                                                   |
| ---------- | ----------------------------------------------------------- |
| Claim      | Capacity rejection, overlap rejection, concurrent last-slot |
| Import     | Each dirty row category from import-pipeline.md             |
| Shift edit | Claim release on time change                                |
| Auth       | Role guard returns 403                                      |
