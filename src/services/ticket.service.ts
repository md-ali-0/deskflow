import { HttpError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type {
  CreateTicketInput,
  ListTicketsQuery,
} from "@/lib/validation/ticket";
import { calculateDueAt } from "./sla.service";
import { classifyTicket } from "./ai.service";

/**
 * The status machine.
 *
 * A ticket may only move along the edges listed here. Anything else is a 422.
 * Keeping it as a plain map means the whole rule is visible in one place and
 * can be unit tested without a database.
 */
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["RESOLVED", "OPEN"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

const ticketInclude = {
  category: true,
  createdBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  _count: { select: { comments: true } },
} as const;

export async function listTickets(filters: ListTicketsQuery) {
  return prisma.ticket.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.assignedToId ? { assignedToId: filters.assignedToId } : {}),
      ...(filters.q
        ? {
            OR: [
              { subject: { contains: filters.q, mode: "insensitive" as const } },
              { number: { contains: filters.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: ticketInclude,
    // Soonest deadline first — the whole point of the product.
    orderBy: [{ dueAt: "asc" }],
    take: 100,
  });
}

export async function getTicket(id: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      ...ticketInclude,
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      activities: {
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) throw new HttpError(404, "Ticket not found");
  return ticket;
}

export async function getDashboardCounts() {
  const [open, inProgress, resolved, closed, overdue] = await Promise.all([
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
    prisma.ticket.count({ where: { status: "RESOLVED" } }),
    prisma.ticket.count({ where: { status: "CLOSED" } }),
    prisma.ticket.count({
      where: {
        dueAt: { lt: new Date() },
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
    }),
  ]);

  return { open, inProgress, resolved, closed, overdue };
}

// ─────────────────────────────────────────────────────────────────────────────
// YOUR JOB — these two are the graded business logic. Everything else in this
// file is plumbing that is already done.
// ─────────────────────────────────────────────────────────────────────────────

export async function createTicket(
  input: CreateTicketInput,
  actorId: string,
): Promise<{ id: string }> {
  // TODO — implement in this order:
  //
  // 1. Load the category:
  //      const category = await prisma.category.findUnique({ where: { id: input.categoryId } })
  //    If it is null, throw new HttpError(404, "Category not found").
  //
  // 2. Work out the next ticket number. Count the tickets, add one, pad to 4:
  //      const count = await prisma.ticket.count()
  //      const number = `TKT-${String(count + 1).padStart(4, "0")}`
  //
  // 3. Compute the deadline:
  //      const dueAt = calculateDueAt(new Date(), category.defaultSlaHours)
  //
  // 4. Auto-assign the least-loaded agent:
  //      const agents = await prisma.user.findMany({
  //        where: { role: "AGENT" },
  //        include: { _count: { select: { assignedTickets: { where: {
  //          status: { in: ["OPEN", "IN_PROGRESS"] } } } } } },
  //      })
  //    Sort by that count ascending and take the first id. If the list is empty,
  //    leave it unassigned (null) — do not crash.
  //
  // 5. Ask the AI. Wrap it so a failure never blocks ticket creation:
  //      let ai = { category: null, confidence: 0 }
  //      try { ai = await classifyTicket(input.subject, input.description) } catch {}
  //
  // 6. Create the ticket with prisma.ticket.create({ data: { ... } }), then
  //    write one ActivityLog row with action "TICKET_CREATED".
  //
  // 7. Return { id: ticket.id }.
  throw new HttpError(501, "createTicket is not implemented yet");
}

export async function transitionStatus(
  ticketId: string,
  nextStatus: string,
  actorId: string,
): Promise<{ id: string }> {
  // TODO — implement in this order:
  //
  // 1. Load the ticket. 404 if missing.
  //
  // 2. Reject illegal moves:
  //      const allowed = ALLOWED_TRANSITIONS[ticket.status] ?? []
  //      if (!allowed.includes(nextStatus)) {
  //        throw new HttpError(422,
  //          `Cannot move a ticket from ${ticket.status} to ${nextStatus}`)
  //      }
  //
  // 3. The guard that earns marks: a ticket cannot be RESOLVED with no public
  //    reply. Count comments where isInternal is false; if zero, throw 422
  //    with a message explaining that a public reply is required first.
  //
  // 4. Update status, and set resolvedAt when moving to RESOLVED (null it
  //    again if the ticket is reopened).
  //
  // 5. Write an ActivityLog row: action "STATUS_CHANGED", fromValue = old
  //    status, toValue = nextStatus, actorId.
  //
  // 6. Return { id: ticketId }.
  throw new HttpError(501, "transitionStatus is not implemented yet");
}

export async function addComment(
  ticketId: string,
  authorId: string,
  body: string,
  isInternal: boolean,
) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new HttpError(404, "Ticket not found");

  return prisma.comment.create({
    data: { ticketId, authorId, body, isInternal },
    include: { author: { select: { id: true, name: true } } },
  });
}
