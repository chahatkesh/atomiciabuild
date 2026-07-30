# Clinic Shift Scheduler

A fullstack clinic shift scheduling app built for the Atomica take-home brief. Managers create and assign shifts; staff claim shifts subject to profession capacity and overlap rules. Dirty CSV imports are normalized with a full audit trail.

## Stack

| Layer       | Choice                                                      |
| ----------- | ----------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Turbopack)                          |
| UI          | Ant Design 6 + Framer dark design system (`docs/design.md`) |
| Database    | MongoDB Atlas via Mongoose 9                                |
| Auth        | Auth.js v5 (Credentials + JWT sessions)                     |
| Validation  | Zod 4                                                       |
| Client data | TanStack Query (polling/refetch-on-focus)                   |
| Tests       | Vitest                                                      |
| Tooling     | pnpm, Husky, commitlint, lint-staged, GitHub Actions        |
| Deploy      | Vercel                                                      |

## Quick start

```bash
cp .env.example .env.local
# Set MONGODB_URI to the Atlas connection string (shared with production)
# Set AUTH_SECRET (e.g. npx auth secret)

pnpm install
pnpm check:db   # verifies the connection and that transactions are available
pnpm seed       # creates the manager and imports both clinic CSVs
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

`pnpm seed` is idempotent, so it is safe to re-run. Use `pnpm seed:reset` to
clear shifts, claims and import history first and re-import from scratch; staff
accounts are preserved either way.

Optional: `docker compose up -d` if you prefer a local Mongo replica set instead of Atlas.
Transactions are required (the claim logic depends on them), so a standalone
`mongod` will not work — use Atlas or the provided replica-set compose file.

## Environment variables

| Variable          | Required | Description                                            |
| ----------------- | -------- | ------------------------------------------------------ |
| `MONGODB_URI`     | Yes      | MongoDB connection string (Atlas or local replica set) |
| `AUTH_SECRET`     | Yes      | Auth.js secret (`npx auth secret`)                     |
| `AUTH_URL`        | Prod     | Public app URL                                         |
| `CLINIC_TIMEZONE` | No       | IANA timezone (default `America/Toronto`)              |
| `AUTH_TRUST_HOST` | No       | Set `true` behind proxies / Vercel preview             |

## Seeded logins

`pnpm seed` creates the manager and imports the 34 staff from `staff.csv`.
**Every account uses the password `Clinic123!`.**

| Role         | Email                              |
| ------------ | ---------------------------------- |
| Manager      | `manager@clinicmail.test`          |
| Doctor       | `marcus.whitfield@clinicmail.test` |
| Nurse        | `anya.haddad@clinicmail.test`      |
| Nurse        | `ivy.bell@clinicmail.test`         |
| Receptionist | `ben.marchand@clinicmail.test`     |
| Receptionist | `hiro.iyer@clinicmail.test`        |

Any other address from `docs/problem-statement/staff.csv` works too, as long as
that row was accepted by the importer — the Import Report page lists which were
not.

## What the import does with the supplied CSVs

| File         | Rows | Accepted | Repaired | Merged | Rejected | Written |
| ------------ | ---- | -------- | -------- | ------ | -------- | ------- |
| `staff.csv`  | 41   | 16       | 18       | 3      | 4        | 34      |
| `shifts.csv` | 117  | 35       | 50       | 27     | 5        | 85      |

Sign in as the manager and open **Imports** for the row-by-row breakdown: what
was wrong with each row and what the importer did about it. The same page
accepts a custom CSV upload, which runs through the identical pipeline.

## Scripts

| Command           | Purpose                                    |
| ----------------- | ------------------------------------------ |
| `pnpm dev`        | Start dev server                           |
| `pnpm build`      | Production build                           |
| `pnpm typecheck`  | TypeScript check                           |
| `pnpm lint`       | ESLint                                     |
| `pnpm test`       | Unit + integration tests                   |
| `pnpm check:db`   | Verify Mongo + transaction support         |
| `pnpm seed`       | Seed manager and import both CSVs          |
| `pnpm seed:reset` | Wipe shifts/claims/imports, then re-import |
| `pnpm seed:users` | Seed only the four original demo accounts  |

## Tests

```bash
pnpm test
```

Unit tests (time maths, shift rules, CSV normalizers) need nothing but the repo.

Integration tests cover the parts that only fail under real conditions:
concurrent claiming, claim revalidation after an edit, and import idempotency.
They connect to `MONGODB_URI` from `.env.local` but always use a **separate
database** (`clinic_scheduler_integration_test`), so they cannot touch seeded
data. Without a reachable cluster they skip rather than fail, which keeps CI
green.

## Deployment (Vercel)

**Production:** https://atomiciabuild.vercel.app

| Stage | What runs                                                         |
| ----- | ----------------------------------------------------------------- |
| CI    | GitHub Actions `quality` — typecheck, lint, test, build           |
| CD    | Same workflow runs `deploy-production` after CI on push to `main` |

Vercel Git auto-deploy is disabled (`git.deploymentEnabled: false`) so only Actions deploys. Requires repo secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

Local and production share the same MongoDB Atlas database (`atomiciabuild`). See [docs/deployment.md](./docs/deployment.md).

```bash
vercel --prod   # manual production deploy (optional)
```

**Cold starts:** Atlas M0 free clusters auto-pause after 30 days idle and may take a few seconds to wake. First request after pause can feel slow.

## Project docs

- [AGENTS.md](./AGENTS.md) — agent/developer instructions
- [DECISIONS.md](./DECISIONS.md) — architectural decisions
- [docs/architecture.md](./docs/architecture.md)
- [docs/design.md](./docs/design.md)
- [docs/auth.md](./docs/auth.md)
- [docs/roadmap.md](./docs/roadmap.md)

## Phase status

**Phase 0:** scaffold, auth, docs, CI/CD, health check, user seeding. Done.

**Phase 1:** shift model, CRUD service, REST API, manager shifts UI. Done.

**Phase 2:** claiming with concurrency guarantees, manager assignment, shift-edit
revalidation, dirty CSV import, and the Import Report page. Done.

**Upcoming:** week-at-a-glance coverage dashboard (Phase 3).
See [docs/roadmap.md](./docs/roadmap.md).
