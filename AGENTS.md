# Agent Instructions

Instructions for AI agents and contributors working on this repository.

## Project

Clinic Shift Scheduler — a Next.js 16 + MongoDB Atlas app for managing clinic staff shifts, claims, and CSV imports.

## Commands

```bash
pnpm install          # install deps
pnpm dev              # dev server
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint
pnpm test             # vitest
pnpm build            # production build
pnpm check:db         # mongo + transaction probe
pnpm seed:users       # seed login accounts
docker compose up -d  # local Mongo replica set
```

## Architecture rules

### Layering (strict one-way)

```
app/ (routes, API handlers) → modules/*.service.ts → modules/*.model.ts
                           ↘ lib/ (infra only)
components/ → props from pages; never import *.model.ts or *.service.ts
```

- **Never** import Mongoose models from `app/` or `components/`.
- **Never** import UI components from `modules/`.
- Business rules live in `modules/*/*.service.ts` and pure `*.rules.ts` helpers.
- API route handlers stay thin — validate input, call service, return JSON envelope.

### Barrels

- One `index.ts` per module boundary (`modules/shifts/index.ts`).
- Client-safe auth exports: `@/modules/auth/client` (schemas only).
- Server auth exports: `@/modules/auth/server` (auth, guards, handlers).
- **No root mega-barrel.** Do not mix `"use client"` and server-only exports in the same barrel.

### Auth

- Auth.js v5 Credentials provider with JWT sessions.
- `src/proxy.ts` is routing-only (optimistic redirect). **Never** put authorization logic only in proxy.
- Every protected API route and server page calls `requireUser()` / `requireManager()` from `@/modules/auth/server`.

### Next.js 16 sharp edges

- File is `src/proxy.ts`, not `middleware.ts`. Export default auth handler.
- Always `await cookies()`, `await headers()`, `await params`, `await searchParams`.
- Wrap `useSearchParams()` consumers in `<Suspense>`.
- Ant Design App Router: use `@ant-design/nextjs-registry`. **No dot-subcomponents** (`Select.Option` → import `Option` from path).

### Validation

- Server must enforce all business rules (capacity, overlap, role checks).
- Client validation is UX only — never the sole gate.

### Concurrency

- Claims use `session.withTransaction()` with version bumps on shift + user documents.
- Unique index on `{ shiftId, staffId }` for claims collection (Phase 2).

### Commits

- Conventional commits enforced by commitlint (`feat:`, `fix:`, `docs:`, `chore:`).
- Pre-commit runs lint-staged (eslint --fix + prettier).

## Definition of done (feature work)

1. Service-layer logic with server-side validation
2. API route or server action wrapper (thin)
3. UI wired with antd components
4. Error messages are user-facing and specific
5. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` pass
6. Decision documented in `DECISIONS.md` if non-obvious

## Key files

| Path                                     | Purpose                              |
| ---------------------------------------- | ------------------------------------ |
| `src/lib/config/env.ts`                  | Zod-validated env                    |
| `src/lib/db/connect.ts`                  | Mongoose singleton                   |
| `src/lib/time/clinic.ts`                 | Timezone, overlap math, week bounds  |
| `src/modules/auth/server.ts`             | Auth entry (server)                  |
| `src/modules/shifts/shift.rules.ts`      | Staffing status, capacity, durations |
| `src/modules/claims/claim.service.ts`    | Transactional claim/release          |
| `src/modules/coverage/coverage.rules.ts` | Pure week aggregation                |
| `src/proxy.ts`                           | Route protection proxy               |
| `scripts/seed.ts`                        | Seed manager + import both CSVs      |
| `docs/roadmap.md`                        | Phase plan + verification results    |
| `docs/design.md`                         | Framer dark UI tokens                |
| `src/theme/tokens.ts`                    | Typed design tokens                  |

## Do not

- Edit `docs/problem-statement/` CSVs (reference only)
- Put mongoose in client bundles
- Skip transaction retry for claim mutations
- Trust client-only validation for business rules
- Recompute staffing status in a view — call `shift.rules`
- Use deprecated antd 6 props (`Alert message`, `Space direction`, `Progress trailColor`, `Statistic valueStyle`, `List`); the console should stay clean
