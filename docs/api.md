# API Reference

REST endpoints under `app/api/*`. All responses use a consistent envelope.

## Response format

### Success

```json
{
  "data": { ... }
}
```

### Error

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "This shift already has enough nurses.",
    "details": {}
  }
}
```

Error codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.

---

## Phase 0 (implemented)

### `GET /api/health`

Public. Mongo connectivity and transaction support probe.

**Response:**

```json
{
  "data": {
    "status": "ok",
    "mongo": {
      "connected": true,
      "transactionsSupported": true
    },
    "timestamp": "2026-07-29T..."
  }
}
```

### `GET|POST /api/auth/[...nextauth]`

Auth.js handlers (login, session, CSRF).

---

## Phase 1 — Shifts (implemented)

Every shift response is serialized as:

```json
{
  "id": "6a6ad13bcaaff9d19fd5307b",
  "date": "2026-08-05",
  "startTime": "22:00",
  "endTime": "06:00",
  "startAt": "2026-08-06T02:00:00.000Z",
  "endAt": "2026-08-06T10:00:00.000Z",
  "requirements": { "doctor": 0, "nurse": 2, "receptionist": 0 },
  "filled": { "doctor": 0, "nurse": 0, "receptionist": 0 },
  "missing": { "doctor": 0, "nurse": 2, "receptionist": 0 },
  "status": "empty",
  "legacyShiftIds": [],
  "version": 0
}
```

`startAt`/`endAt` are UTC instants derived from the clinic-local `date` +
`startTime`/`endTime`. Overnight windows roll the end into the next day.

### `GET /api/shifts?from=YYYY-MM-DD&to=YYYY-MM-DD`

List shifts, sorted by start. Any authenticated user. Both params optional.

### `POST /api/shifts`

Create a shift. **Manager only.**

**Body:** `{ date, startTime, endTime, requirements: { doctor, nurse, receptionist } }`

`startTime`/`endTime` accept `HH:mm` or `HH:mm+1` for an explicit next-day end.

**Errors:**

- `409 CONFLICT` — a shift already occupies that date and window
- `422 VALIDATION_ERROR` — bad date/time, identical start and end, duration
  under 30 minutes or over 16 hours

### `GET /api/shifts/:shiftId`

Single shift. Any authenticated user. `404` if unknown.

### `PATCH /api/shifts/:shiftId`

Partial update; increments `version`. **Manager only.** Same validation and
conflict rules as create. Phase 2 adds claim revalidation on time changes.

### `DELETE /api/shifts/:shiftId`

Delete a shift. **Manager only.** Returns `{ id, deleted: true }`, or `404`.

---

## Phase 2 — Claims

### `POST /api/shifts/:id/claims`

Claim shift (self or manager assign).

**Body:** `{ "staffId"?: string }` — omit for self-claim.

**Errors:**

- `409` — profession full
- `409` — overlaps existing claim

### `DELETE /api/shifts/:id/claims/:staffId`

Unclaim. Self or manager.

---

## Phase 2 — Import

### `POST /api/import`

Manager only. Multipart CSV upload.

**Body:** `staff` file, `shifts` file (one or both).

**Response:** Import run report.

### `GET /api/import/runs`

List import runs. Manager only.

### `GET /api/import/runs/:id`

Single run with full row report.

---

## Phase 3 — Coverage

### `GET /api/coverage?weekStart=YYYY-MM-DD`

Week-at-a-glance staffing summary.

**Response:**

```json
{
  "data": {
    "weekStart": "2026-08-03",
    "weekEnd": "2026-08-09",
    "shifts": [
      {
        "shiftId": "...",
        "date": "2026-08-05",
        "startTime": "09:00",
        "endTime": "17:00",
        "status": "partially_staffed",
        "requirements": { "doctor": 1, "nurse": 2, "receptionist": 1 },
        "filled": { "doctor": 1, "nurse": 1, "receptionist": 0 },
        "missing": { "doctor": 0, "nurse": 1, "receptionist": 1 }
      }
    ]
  }
}
```

---

## Client consumption

TanStack Query hooks poll these endpoints. Mutations invalidate relevant query keys from `constants/QUERY_KEYS`.

Server Actions (optional) will call the same service functions without duplicating logic.
