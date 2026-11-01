# DeskFlow — Database and Structure Reference

Companion sheet to the assignment handout. Everything below is taken from the running code, not from memory.

## 1. Entity relationship

```
┌─────────────────────┐          ┌─────────────────────┐
│        User         │          │      Category       │
├─────────────────────┤          ├─────────────────────┤
│ id            (PK)  │          │ id            (PK)  │
│ email      (UNIQUE) │          │ name       (UNIQUE) │
│ passwordHash        │          │ defaultSlaHours     │
│ name                │          └──────────┬──────────┘
│ role                │                     │
└──────┬───────┬──────┘                     │
       │       │                            │
       │       │  assignedToId (nullable)   │
       │       └──────────┐                 │
       │ createdById      │                 │
       ▼                  ▼                 ▼
┌───────────────────────────────────────────────────────┐
│                        Ticket                         │
├───────────────────────────────────────────────────────┤
│ id            (PK)          categoryId        (FK)    │
│ number     (UNIQUE)         createdById       (FK)    │
│ subject                     assignedToId      (FK)    │
│ description                 dueAt                     │
│ status                      resolvedAt                │
│ priority                    aiCategory / aiConfidence │
│ createdAt / updatedAt       aiAccepted                │
└────────────┬──────────────────────────┬───────────────┘
             │                          │
             ▼                          ▼
   ┌──────────────────┐      ┌──────────────────────┐
   │     Comment      │      │     ActivityLog      │
   ├──────────────────┤      ├──────────────────────┤
   │ id          (PK) │      │ id            (PK)   │
   │ ticketId    (FK) │      │ ticketId      (FK)   │
   │ authorId    (FK) │      │ actorId       (FK)   │
   │ body             │      │ action               │
   │ isInternal       │      │ fromValue / toValue  │
   └──────────────────┘      └──────────────────────┘
```

## 2. Models at a glance

| Model | What it holds | Worth knowing |
| --- | --- | --- |
| `User` | agents and admins | one table, split by `role` |
| `Category` | SLA hours per ticket type | SLA is data, not hardcoded — a new category needs no deploy |
| `Ticket` | the ticket itself | three AI fields live here: `aiCategory`, `aiConfidence`, `aiAccepted` |
| `Comment` | replies and internal notes | `isInternal` separates customer-visible from staff-only |
| `ActivityLog` | who did what, when | separate from comments because events are immutable, comments are conversation |

## 3. Enums

| Enum | Values |
| --- | --- |
| `Role` | `AGENT`, `ADMIN` |
| `Status` | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `Priority` | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |

## 4. Constraints and indexes

| Table | Constraint | Why it exists |
| --- | --- | --- |
| `User` | `email` unique | one account per address |
| `Category` | `name` unique | no duplicate categories |
| `Ticket` | `number` unique | turns a numbering race into a `P2002` the code can retry |
| `Ticket` | index on `status` | the list filter |
| `Ticket` | index on `assignedToId` | the assignment count query |
| `Ticket` | index on `dueAt` | ordering and the breach count |
| `Comment` | index on `ticketId` | the detail page |
| `ActivityLog` | index on `ticketId` | the detail page |

Deleting a ticket cascades to its comments and activity rows, so no orphan records survive.

## 5. Status workflow

`OPEN → IN_PROGRESS → RESOLVED → CLOSED`, with reopen paths and `CLOSED` terminal.

| From | May move to |
| --- | --- |
| `OPEN` | `IN_PROGRESS`, `CLOSED` |
| `IN_PROGRESS` | `RESOLVED`, `OPEN` |
| `RESOLVED` | `CLOSED`, `IN_PROGRESS` |
| `CLOSED` | nothing — terminal |

Anything outside this table returns **422** from the API. The UI only hides the button; it is not the guard.

## 6. SLA by category

| Category | Hours | Used for |
| --- | --- | --- |
| Billing | 4 | invoices, refunds, charges |
| Technical | 12 | errors, crashes, broken exports |
| Account | 24 | login, password, 2FA |
| Other | 48 | anything unmatched |
| Feature Request | 72 | new functionality |

`dueAt = createdAt + defaultSlaHours`, stamped at creation from the server clock. A ticket is breached when `dueAt < now` **and** it is still `OPEN` or `IN_PROGRESS`.

## 7. API surface

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | create an account, sign in |
| `POST` | `/api/auth/login` | sign in |
| `POST` | `/api/auth/logout` | clear the session cookie |
| `GET` | `/api/auth/me` | current user |
| `GET` | `/api/tickets` | list, filter by `status`, `priority`, `q` |
| `POST` | `/api/tickets` | create a ticket |
| `GET` | `/api/tickets/:id` | ticket with replies and activity |
| `PATCH` | `/api/tickets/:id` | change status |
| `POST` | `/api/tickets/:id/comments` | add a reply or internal note |
| `GET` | `/api/dashboard` | counts per status plus SLA breaches |

## 8. Error responses

| Code | Meaning |
| --- | --- |
| `400` | malformed JSON |
| `401` | not signed in, or the session expired |
| `404` | ticket or category does not exist |
| `409` | email already registered |
| `422` | validation failed, illegal status move, or resolve without a public reply |
| `500` | unexpected — logged, generic message returned |

## 9. Where things live

| Path | What it does |
| --- | --- |
| `src/proxy.ts` | Edge middleware: JWT verify only, no Prisma |
| `src/lib/auth.ts` | sign/verify session, `HttpError`, `toErrorResponse` |
| `src/lib/db.ts` | Prisma singleton with the pg adapter |
| `src/lib/ticket-rules.ts` | the transition map and the resolve guard — pure, no DB |
| `src/lib/validation/ticket.ts` | every Zod schema |
| `src/services/sla.service.ts` | `calculateDueAt` |
| `src/services/ai.service.ts` | triage with keyword fallback |
| `src/services/ticket.service.ts` | creation, status changes, comments, numbering retry |
| `prisma/schema.prisma` | the five models above |
| `tests/ticket-rules.test.ts` | SLA maths and every legal and illegal transition |
