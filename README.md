# DeskFlow

A support desk for small teams: tickets with an SLA deadline, a status workflow that
cannot be bypassed, and AI triage that suggests a category as each ticket arrives.

Built for the NT Tech Innovation full-stack assessment.

- Repository: https://github.com/md-ali-0/deskflow
- Live demo: https://deskflow-liart.vercel.app

## Deploying

The build needs a generated Prisma client, so `package.json` runs `prisma generate`
as a `postinstall` hook. Without it the build fails with
`Module '"@prisma/client"' has no exported member 'PrismaClient'` and a cascade of
implicit-`any` errors.

1. Create a PostgreSQL database (Neon, Supabase or any managed Postgres).
2. Import the repo into Vercel and set two environment variables for all
   environments: `DATABASE_URL` and `JWT_SECRET`. `DATABASE_URL` must be present at
   build time, because `prisma.config.ts` reads it while the client is generated.
3. Prepare the database once from your machine, pointing at the production URL:

   ```bash
   DATABASE_URL="postgresql://…" npx prisma migrate deploy
   DATABASE_URL="postgresql://…" npx prisma db seed
   ```

4. Deploy, then sign in with the demo credentials above.

The `AI_*` variables are optional in production too; without them triage uses the
keyword fallback.

## What it does

- **Tickets** with a category, priority, requester and assignee.
- **SLA deadlines.** Each category carries its own SLA (Billing 4h, Technical 12h,
  Account 24h, Feature Request 72h, Other 48h). The deadline is stamped at creation
  from the server clock, and the list is ordered so live work with the nearest
  deadline comes first.
- **Status machine.** `OPEN → IN_PROGRESS → RESOLVED → CLOSED`, with reopen paths.
  Illegal moves are rejected by the API, not just hidden in the UI.
- **Resolution guard.** A ticket cannot be moved to `RESOLVED` until somebody has
  posted a public reply — an internal note does not count.
- **AI triage.** The model classifies the text into one of the five categories and
  stores its suggestion with a confidence score. If the model is unreachable, slow
  or returns something unexpected, keyword rules take over and the ticket is still
  created.
- **Load-balanced assignment.** New tickets go to the agent with the fewest open
  tickets.
- **Audit trail.** Every creation, status change and reply is written to an activity
  log, so the ticket page can show how it actually got resolved.
- **Authentication.** Email + password, bcrypt hashes, JWT session in an httpOnly
  cookie, 8-hour expiry.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.4 (App Router, React Compiler, `cacheComponents`) |
| UI | React 19, Tailwind CSS v4, shadcn/ui (base-ui primitives) |
| Database | PostgreSQL with Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| Validation | Zod 4 |
| Auth | `jose` (HS256 JWT) + `bcryptjs` |
| Language | TypeScript, strict |

## Getting started

Requirements: Node.js 20+, pnpm, and a PostgreSQL database.

```bash
pnpm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | Signing key for the session cookie — any long random string |
| `AI_API_KEY` | no | OpenAI-compatible API key for triage |
| `AI_BASE_URL` | no | e.g. `https://api.openai.com/v1` |
| `AI_MODEL` | no | e.g. `gpt-4o-mini` |

The three `AI_*` variables are optional. Leave them empty and triage falls back to
keyword rules, which is the default state of a fresh clone.

```bash
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

The seed wipes and recreates every row, including the users, so it also invalidates
any session cookie that was issued before it ran. If you re-seed while signed in,
sign out and back in.

Open http://localhost:3000 — you will be redirected to the login page.

### Demo credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@deskflow.dev` | `Admin@2026` |
| Agent | `agent@deskflow.dev` | `Agent@2026` |

The login page has a button next to each account that fills the form in one click.
The seed creates 20 tickets, 10 replies and 33 activity entries, including several
tickets that are already past their SLA deadline so the overdue styling and the
dashboard breach count have something to show.

## Project layout

```
src/
  app/
    (app)/              authenticated shell: account, tickets, dashboard
    api/                route handlers (auth, tickets, comments, dashboard)
    login/  register/   public pages
  components/           UI, mostly shadcn defaults
  lib/
    auth.ts             JWT sign/verify, session helpers, error mapping
    db.ts               Prisma client singleton with the pg adapter
    validation/         Zod schemas shared by API and UI
  services/
    ticket.service.ts   status machine, creation, queries
    sla.service.ts      deadline calculation
    ai.service.ts       triage with keyword fallback
  proxy.ts              route protection (Next 16 renamed middleware to proxy)
prisma/
  schema.prisma         User, Category, Ticket, Comment, ActivityLog
  seed.ts               demo data
```

## API

All endpoints require the session cookie except `POST /api/auth/login` and
`POST /api/auth/register`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account, sign in |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/logout` | Clear the session cookie |
| `GET` | `/api/auth/me` | Current user |
| `GET` | `/api/tickets` | List, filter by `status`, `priority`, `q` |
| `POST` | `/api/tickets` | Create a ticket |
| `GET` | `/api/tickets/:id` | Ticket with replies and activity |
| `PATCH` | `/api/tickets/:id` | Change status |
| `POST` | `/api/tickets/:id/comments` | Add a reply or internal note |
| `GET` | `/api/dashboard` | Counts per status plus SLA breaches |

Errors use a small, consistent shape:

```
400  malformed JSON
401  not signed in
404  ticket or category does not exist
409  email already registered
422  validation failed, illegal status move, or resolve without a public reply
```

## Design decisions

**A hand-written session instead of an auth library.** Login, logout and the session
check live in `src/lib/auth.ts` and can be read in one sitting, which matters more
here than the extra features an auth library would bring. The JWT carries the user's
id, name, email and role, so most requests never touch the user table.

**A driver adapter is mandatory in Prisma 7.** `new PrismaClient()` on its own throws
at runtime; the client has to be constructed with `new PrismaPg({ connectionString })`.
The `url` also moved out of `schema.prisma` and into `prisma.config.ts`.

**Middleware is called `proxy` in Next 16.** `src/proxy.ts` replaces the deprecated
`middleware.ts`. It runs on the Edge runtime, so it only verifies the JWT with `jose`
— no Prisma, no bcrypt — and returns `401` for `/api/*` while redirecting pages to
`/login?next=…`.

**Route handlers read the cookie from the request.** `cookies()` from `next/headers`
works, but with `cacheComponents` enabled the build probes every GET handler with no
request context, and `cookies()` rejects there. Reading the `cookie` header directly
avoids that and keeps the handler honest about its input.

**`toErrorResponse` re-throws framework signals.** Next implements `redirect()`,
`notFound()` and "stop prerendering" by throwing objects whose `digest` starts with
`NEXT_`. A catch-all that swallows them turns a redirect into a 500, so those are
re-thrown before anything else is inspected.

**Ticket numbers are computed, not sequenced.** `TKT-0001` comes from a row count, so
two requests arriving together can compute the same number. The unique index turns
that into a `P2002`, and creation retries with a fresh count (up to three attempts)
instead of failing or duplicating.

**The activity row is written in the same transaction as the change.** Creating a
ticket, moving its status and adding a reply all use a nested write or
`$transaction`, so the audit trail can never disagree with the ticket.

**Triage is advisory.** A dead model, a bad key, a timeout or an unknown category all
fall through to keyword rules with `confidence: 0`. The ticket is created either way;
`aiAccepted` records whether the human's category matched the suggestion, so the
accuracy claim is measurable rather than asserted.

**Pages stream instead of blocking.** The header needs `connection()` and every page
needs the database, so both sit inside their own `<Suspense>` boundary in the app
layout. The shell arrives first, each page shows a skeleton sized to its real layout
while the query runs, and the content fills in. `cacheComponents` also *requires*
this: anything read at request time must be inside a boundary, and the
`dynamic` route-segment config is rejected outright.

## Testing

```bash
pnpm test
```

Unit tests cover the two pieces of logic that would be expensive to get wrong: the SLA
deadline calculation and the status machine including the resolve guard. Both are pure
functions, so the tests need no database.

## Known limitations

- No pagination: the ticket list is capped at 100 rows, which is fine for a demo and
  not fine for a real queue.
- No email notifications, file attachments, or team/tenant separation.
- Roles exist (`AGENT`, `ADMIN`) but are only used for display today; every signed-in
  user can change any ticket.
- AI triage runs synchronously during creation, so a slow model adds latency. A queue
  would be the right answer in production.
