# Clinic Shift Scheduler

A fullstack clinic shift scheduling app built for the Atomica take-home brief. Managers create and assign shifts; staff claim shifts subject to profession capacity and overlap rules. Dirty CSV imports are normalized with a full audit trail.

## Stack

| Layer       | Choice                                               |
| ----------- | ---------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Turbopack)                   |
| UI          | Ant Design 6 + `@ant-design/nextjs-registry`         |
| Database    | MongoDB Atlas via Mongoose 9                         |
| Auth        | Auth.js v5 (Credentials + JWT sessions)              |
| Validation  | Zod 4                                                |
| Client data | TanStack Query (polling/refetch-on-focus)            |
| Tests       | Vitest                                               |
| Tooling     | pnpm, Husky, commitlint, lint-staged, GitHub Actions |
| Deploy      | Vercel                                               |

## Quick start

```bash
cp .env.example .env.local
# Edit MONGODB_URI and AUTH_SECRET

docker compose up -d
pnpm install
pnpm check:db
pnpm seed:users
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable          | Required | Description                                            |
| ----------------- | -------- | ------------------------------------------------------ |
| `MONGODB_URI`     | Yes      | MongoDB connection string (Atlas or local replica set) |
| `AUTH_SECRET`     | Yes      | Auth.js secret (`npx auth secret`)                     |
| `AUTH_URL`        | Prod     | Public app URL                                         |
| `CLINIC_TIMEZONE` | No       | IANA timezone (default `America/Toronto`)              |
| `AUTH_TRUST_HOST` | No       | Set `true` behind proxies / Vercel preview             |

## Seeded logins

Run `pnpm seed:users` after MongoDB is reachable.

| Role         | Email                              | Password     |
| ------------ | ---------------------------------- | ------------ |
| Manager      | `manager@clinicmail.test`          | `Clinic123!` |
| Doctor       | `marcus.whitfield@clinicmail.test` | `Clinic123!` |
| Nurse        | `anya.haddad@clinicmail.test`      | `Clinic123!` |
| Receptionist | `ben.marchand@clinicmail.test`     | `Clinic123!` |

## Scripts

| Command           | Purpose                            |
| ----------------- | ---------------------------------- |
| `pnpm dev`        | Start dev server                   |
| `pnpm build`      | Production build                   |
| `pnpm typecheck`  | TypeScript check                   |
| `pnpm lint`       | ESLint                             |
| `pnpm test`       | Vitest unit tests                  |
| `pnpm check:db`   | Verify Mongo + transaction support |
| `pnpm seed:users` | Seed manager/staff accounts        |

## Tests

```bash
pnpm test
```

## Deployment (Vercel)

1. Connect the GitHub repo to Vercel.
2. Set `MONGODB_URI`, `AUTH_SECRET`, `AUTH_URL`, `CLINIC_TIMEZONE` in project env.
3. Push to `main` — CI runs on GitHub Actions; Vercel deploys on green.

**Cold starts:** Atlas M0 free clusters auto-pause after 30 days idle and may take a few seconds to wake. First request after pause can feel slow.

## Project docs

- [AGENTS.md](./AGENTS.md) — agent/developer instructions
- [DECISIONS.md](./DECISIONS.md) — architectural decisions
- [docs/architecture.md](./docs/architecture.md)
- [docs/design.md](./docs/design.md)
- [docs/auth.md](./docs/auth.md)
- [docs/roadmap.md](./docs/roadmap.md)

## Phase status

**Phase 0 (current):** scaffold, auth shell, docs, CI/CD, health check, user seeding.

**Upcoming:** shift CRUD (Phase 1), claiming + import (Phase 2), coverage dashboard (Phase 3).
