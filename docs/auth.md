# Authentication & Authorization

## Provider

**Auth.js v5** (`next-auth@5.0.0-beta.32`) with Credentials provider.

## Session strategy

JWT (required for Credentials provider — DB sessions not supported).

JWT payload includes:

- `sub` — user ID
- `role` — `manager` | `staff`
- `profession` — `doctor` | `nurse` | `receptionist` (staff only)

Set via `jwt` and `session` callbacks in `auth.config.ts`.

## File layout

| File                          | Purpose                                         |
| ----------------------------- | ----------------------------------------------- |
| `modules/auth/auth.config.ts` | Edge-safe config (callbacks, pages)             |
| `modules/auth/auth.ts`        | Full NextAuth init with Credentials             |
| `modules/auth/server.ts`      | Server barrel (auth, guards, handlers)          |
| `modules/auth/client.ts`      | Client-safe barrel (loginSchema only)           |
| `modules/auth/guards.ts`      | `requireUser`, `requireManager`, page redirects |
| `modules/auth/password.ts`    | bcrypt hash/verify                              |
| `src/proxy.ts`                | Optimistic route protection                     |

## Login flow

1. User submits email + password on `/login`
2. Client validates with `loginSchema` (Zod)
3. `signIn("credentials", { redirect: false })`
4. Auth.js calls `authorize()` → `findUserByEmail` → `verifyPassword`
5. On success, JWT session cookie set; redirect to `/dashboard`

## Route protection

### Layer 1: Proxy (optimistic)

`src/proxy.ts` exports Auth.js handler. Redirects unauthenticated users away from protected routes. Manager-only `/imports` redirect for staff.

### Layer 2: Server guards (authoritative)

Every protected server entry point calls:

```typescript
const user = await requireUser(); // API routes
const user = await requireManager(); // manager-only API
const user = await requireUserPage(); // pages (redirects to /login)
const user = await requireManagerPage(); // manager pages
```

**Never rely on proxy alone.**

## Roles & permissions

| Action                    | Manager | Staff |
| ------------------------- | ------- | ----- |
| View coverage dashboard   | ✓       | ✓     |
| Create/edit/delete shifts | ✓       | ✗     |
| Assign staff to shift     | ✓       | ✗     |
| Claim shift (self)        | ✓       | ✓     |
| Unclaim shift (self)      | ✓       | ✓     |
| Upload CSV import         | ✓       | ✗     |
| View import report        | ✓       | ✗     |

## Environment

```
AUTH_SECRET=...          # Required
AUTH_URL=...             # Production URL
AUTH_TRUST_HOST=true     # Vercel / proxy setups
```

Generate secret: `npx auth secret`

## Type augmentation

`src/types/next-auth.d.ts` extends Session and JWT with `role` and `profession`.

## Security notes

- Passwords hashed with bcrypt (12 rounds)
- No password in JWT or API responses
- Auth route: `app/api/auth/[...nextauth]/route.ts`
- Health route (`/api/health`) is public
