# Architecture

## Overview

Clinic Shift Scheduler is a layered Next.js application. All business rules live in `src/modules/*`; entry points in `src/app` stay thin.

```mermaid
flowchart TD
  subgraph edge [Entry points]
    Pages["app/(app)/* pages"]
    API["app/api/* routes"]
    Proxy["src/proxy.ts"]
  end
  subgraph domain [Domain modules]
    Auth["modules/auth"]
    Users["modules/users"]
    Shifts["modules/shifts"]
    Claims["modules/claims"]
    Import["modules/import"]
    Coverage["modules/coverage"]
  end
  subgraph infra [Infrastructure]
    Lib["lib/config, db, errors, time"]
  end
  Proxy --> Auth
  Pages --> Auth
  Pages --> Shifts
  API --> Shifts
  API --> Claims
  Shifts --> Lib
  Claims --> Lib
  Users --> Lib
  Import --> Users
  Import --> Shifts
  Coverage --> Shifts
  Coverage --> Claims
```

## Directory structure

```
src/
├── app/                    # Routes and API handlers (thin)
│   ├── (auth)/login/
│   ├── (app)/              # Authenticated shell
│   └── api/
├── components/             # Presentational UI (no domain imports)
├── constants/              # App-wide constants
├── hooks/                  # Client hooks (queries, realtime port, polling)
├── lib/                    # Infrastructure (db, env, errors, time)
├── modules/                # Domain logic
│   ├── auth/               # client.ts + server.ts split
│   ├── users/
│   ├── shifts/
│   ├── claims/
│   ├── imports/
│   └── coverage/           # rules (pure) + service (reads shifts & claims)
├── providers/              # React context providers
└── types/                  # Shared TypeScript types
```

## Request flow

### Authenticated page

1. `proxy.ts` — optimistic redirect if no session cookie
2. `(app)/layout.tsx` — `requireUserPage()` loads session, renders `AppShell`
3. Page component — fetches data via server component or client query

### API mutation (e.g. claim shift)

1. `POST /api/shifts/:id/claims`
2. `requireUser()` or `requireManager()`
3. Zod validate body
4. `claimService.claimShift()` inside transaction
5. Return `{ data }` or `{ error: { code, message } }`

## Data flow principles

| Principle              | Implementation                                                    |
| ---------------------- | ----------------------------------------------------------------- |
| Single source of truth | MongoDB via Mongoose models                                       |
| Server enforcement     | All business rules in services                                    |
| Denormalized counters  | `shift.filled.{doctor,nurse,receptionist}` updated in transaction |
| Optimistic UI          | TanStack Query invalidation after mutation                        |
| Audit trail            | Import runs persist every row verdict                             |

## Serverless considerations

- **Connection caching:** `globalThis.mongooseCache` in `lib/db/connect.ts`
- **Transactions:** Required for claims; probed at `/api/health` and `pnpm check:db`
- **Cold starts:** Atlas M0 pause + Vercel function cold start may add latency on first request

## Module boundaries

| Module     | Responsibility                           | Phase |
| ---------- | ---------------------------------------- | ----- |
| `auth`     | Login, session, guards                   | 0 ✓   |
| `users`    | Staff/manager accounts                   | 0 ✓   |
| `shifts`   | CRUD, time normalization                 | 1 ✓   |
| `claims`   | Claim/unclaim, overlap/capacity          | 2 ✓   |
| `imports`  | CSV parse, merge, report                 | 2 ✓   |
| `coverage` | Week-at-a-glance aggregation (read-only) | 3 ✓   |

`coverage` is the only module that reads from two others (`shifts` and `claims`)
and writes to none. It composes their records rather than querying their
collections directly, so staffing status is computed in exactly one place
(`shift.rules`) no matter which view asks for it.

### Where the cycles were

`shift.service` needed to release claims after an edit, and `claim.service`
needed to serialize a shift for its response — a cycle. `shift.serializer.ts`
holds `toShiftRecord()` on its own so both can import it. Read-only `coverage`
sits above both and introduces no new edges.

## ESLint enforcement

- `components/**` cannot import `*.model.ts` or `*.service.ts`
- `app/**` cannot import `*.model.ts`
- `modules/**` cannot import `components/**`

See [auth.md](./auth.md), [data-model.md](./data-model.md), [concurrency.md](./concurrency.md).
