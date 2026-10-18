import { Prisma, type Status } from "@prisma/client";
import { HttpError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type {
  CreateTicketInput,
  ListTicketsQuery,
} from "@/lib/validation/ticket";
import { calculateDueAt } from "./sla.service";
import { classifyTicket } from "./ai.service";

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
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
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

const MAX_NUMBER_ATTEMPTS = 3;

export async function createTicket(
  input: CreateTicketInput,
  actorId: string,
): Promise<{ id: string }> {
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true, name: true, defaultSlaHours: true },
  });

  if (!category) {
    throw new HttpError(404, "Category not found");
  }

  const dueAt = calculateDueAt(new Date(), category.defaultSlaHours);

  const agents = await prisma.user.findMany({
    where: { role: "AGENT" },
    select: {
      id: true,
      _count: {
        select: {
          assignedTickets: {
            where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
          },
        },
      },
    },
  });

  agents.sort((a, b) => a._count.assignedTickets - b._count.assignedTickets);
  const assignedToId = agents[0]?.id ?? null;

  let aiCategory: string | null = null;
  let aiConfidence: number | null = null;
  try {
    const ai = await classifyTicket(input.subject, input.description);
    aiCategory = ai.category;
    aiConfidence = ai.confidence;
  } catch {
    aiCategory = null;
    aiConfidence = null;
  }

  for (let attempt = 1; ; attempt += 1) {
    const count = await prisma.ticket.count();
    const number = `TKT-${String(count + 1).padStart(4, "0")}`;

    try {
      const ticket = await prisma.ticket.create({
        data: {
          number,
          subject: input.subject,
          description: input.description,
          priority: input.priority,
          categoryId: category.id,
          createdById: actorId,
          assignedToId,
          dueAt,
          aiCategory,
          aiConfidence,
          aiAccepted: aiCategory ? aiCategory === category.name : null,
          activities: {
            create: {
              actorId,
              action: "TICKET_CREATED",
              toValue: "OPEN",
            },
          },
        },
        select: { id: true },
      });

      return { id: ticket.id };
    } catch (error) {
      const isNumberClash =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";

      if (!isNumberClash || attempt >= MAX_NUMBER_ATTEMPTS) throw error;
    }
  }
}

export async function transitionStatus(
  ticketId: string,
  nextStatus: Status,
  actorId: string,
): Promise<{ id: string }> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, status: true, resolvedAt: true },
  });

  if (!ticket) throw new HttpError(404, "Ticket not found");

  if (ticket.status === nextStatus) {
    throw new HttpError(422, `Ticket is already ${nextStatus}`);
  }

  const allowed = ALLOWED_TRANSITIONS[ticket.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new HttpError(
      422,
      `Cannot move a ticket from ${ticket.status} to ${nextStatus}`,
    );
  }

  if (nextStatus === "RESOLVED") {
    const publicReplies = await prisma.comment.count({
      where: { ticketId, isInternal: false },
    });

    if (publicReplies === 0) {
      throw new HttpError(
        422,
        "Add a public reply before resolving — the customer needs to see what fixed it.",
      );
    }
  }

  const resolvedAt =
    nextStatus === "RESOLVED"
      ? new Date()
      : nextStatus === "CLOSED"
        ? ticket.resolvedAt
        : null;

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: nextStatus,
      resolvedAt,
      activities: {
        create: {
          actorId,
          action: "STATUS_CHANGED",
          fromValue: ticket.status,
          toValue: nextStatus,
        },
      },
    },
    select: { id: true },
  });

  return { id: updated.id };
}

export async function addComment(
  ticketId: string,
  authorId: string,
  body: string,
  isInternal: boolean,
) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new HttpError(404, "Ticket not found");

  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: { ticketId, authorId, body, isInternal },
      include: { author: { select: { id: true, name: true } } },
    }),
    prisma.activityLog.create({
      data: {
        ticketId,
        actorId: authorId,
        action: "COMMENT_ADDED",
        toValue: isInternal ? "internal" : "public",
      },
    }),
  ]);

  return comment;
}
