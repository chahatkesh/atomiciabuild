# Concurrency Model

The brief requires shift availability to stay accurate when multiple staff act simultaneously. Server-side enforcement is mandatory.

## Problem

Race condition: two nurses claim the last nurse slot on the same shift at the same time. Without coordination, both could succeed.

## Solution

### 1. Unique claim index

```javascript
{ shiftId: 1, staffId: 1 }  // unique
```

Prevents duplicate claims by the same person. Does **not** alone prevent over-capacity.

### 2. Transactional claim flow

Each claim runs in `session.withTransaction()` (auto-retries `TransientTransactionError`):

```
BEGIN TRANSACTION
  1. Read shift (requirements, filled counters, version)
  2. Read user's active claims (overlap check)
  3. Validate: capacity for profession not exceeded
  4. Validate: no time overlap with user's other claims
  5. Insert claim document
  6. $inc shift.filled.{profession} and shift.version
  7. $inc user.version
COMMIT
```

If two transactions contend on the same shift document, MongoDB returns `WriteConflict`; the callback API retries.

### 3. Version fields

Both `shifts.version` and `users.version` increment on every claim/unclaim. This ensures concurrent operations on shared documents serialize through MongoDB's MVCC.

### 4. Manager assignment

Same transaction path as self-claim, with `assignedByManager: true`. Rules are identical — capacity and overlap enforced server-side.

### 5. Shift time edit revalidation

When a manager edits shift times:

```
BEGIN TRANSACTION
  For each active claim on shift:
    Re-check overlap against staff's other claims
    Re-check capacity (claim may still be valid)
    If invalid → set status: "released", decrement filled, record reason
  Update shift times
COMMIT
```

## Overlap detection

Half-open interval test on UTC `startAt`/`endAt`:

```
overlap = a.startAt < b.endAt && a.endAt > b.startAt
```

Back-to-back shifts (end == next start) do **not** overlap.

## Transaction support probe

- `GET /api/health` returns `mongo.transactionsSupported`
- `pnpm check:db` exits non-zero if transactions unavailable
- Local dev: `docker compose up -d` initializes single-node replica set

## Atlas M0 notes

M0 runs a 3-node replica set and supports transactions. Be mindful of the ~100 ops/sec rate limit under heavy concurrent load — polling + many simultaneous claimers could throttle.

## Testing strategy (future)

Integration tests with parallel `Promise.all` claim requests against one shift, asserting exactly one succeeds when one slot remains.
