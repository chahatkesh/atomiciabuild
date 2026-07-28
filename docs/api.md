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

## Phase 1 — Shifts

### `GET /api/shifts?from=&to=`

List shifts in date range. Auth required.

### `GET /api/shifts/:id`

Single shift with claim summary.

### `POST /api/shifts`

Create shift. Manager only.

### `PATCH /api/shifts/:id`

Update shift. Manager only. Returns impact preview if claims exist.

### `DELETE /api/shifts/:id`

Delete shift. Manager only.

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
