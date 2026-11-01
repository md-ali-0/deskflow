/**
 * ============================================================================
 *                    DESKFLOW - TICKET SERVICE LAYER (বিজনেস লজিক)
 * ============================================================================
 * 
 * [আর্কিটেকচারাল সারসংক্ষেপ / Architecture Overview]:
 * এই ফাইলটি DeskFlow হেল্পডেস্কের কোর "Business Logic & Orchestration Layer"।
 * ক্লিন আর্কিটেকচার অনুযায়ী, এটি Next.js API Routes (Controllers) এবং 
 * PostgreSQL/Prisma Database-এর মাঝে একটি শক্তিশালী ব্রিজের কাজ করে।
 * 
 * [ইন্টারভিউ স্পেশাল পয়েন্ট / Key Talking Points for Interview]:
 * ১. Decoupling: কন্ট্রোলার শুধুমাত্র HTTP Request রিসিভ করে এবং Service কে কল করে।
 * ২. Data Integrity & Concurrency: টিকিট নাম্বার জেনারেশন ও ট্রানজিশনে Race Condition হ্যান্ডলিং।
 * ৩. Business Rules Enforcement: স্ট্যাটাস ট্রানজিশনে স্টেট মেশিন এবং রেজোলিউশন গার্ড।
 * ৪. Smart Load Balancing: সর্বনিম্ন কাজের চাপ থাকা এজেন্টকে অটোমেটিক টিকিট অ্যাসাইন।
 * ৫. Graceful AI Degradation: AI ট্রায়াজ ব্যর্থ হলেও টিকিট তৈরি কখনোই আটকে থাকে না।
 * ============================================================================
 */

import { Prisma, type Status } from "@prisma/client";
import { HttpError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canResolve, isTransitionAllowed } from "@/lib/ticket-rules";
import type {
  CreateTicketInput,
  ListTicketsQuery,
} from "@/lib/validation/ticket";
import { calculateDueAt } from "./sla.service";
import { classifyTicket } from "./ai.service";

// স্টেট মেশিন রুলস এক্সপোর্ট করা হলো যাতে কন্ট্রোলার ও UI সরাসরি রুলস অ্যাক্সেস করতে পারে
export { ALLOWED_TRANSITIONS } from "@/lib/ticket-rules";

/**
 * [Prisma Reusable Include Projection]:
 * টিকিট সম্পর্কিত ডেটা ফেচ করার সময় প্রতিবার জয়েন লেখার পুনরাবৃত্তি এড়াতে এই অবজেক্টটি তৈরি।
 * 
 * সিকিউরিটি সতর্কতা: 
 * 'createdBy' এবং 'assignedTo' ইউজার অবজেক্ট থেকে কখনোই passwordHash সিলেক্ট করা হয় না।
 * শুধু id, name, email প্রজেক্ট করা হয়েছে যা ডেটা লিকেজ সম্পূর্ণ রোধ করে।
 */
const ticketInclude = {
  category: true,
  createdBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  _count: { select: { comments: true } }, // মোট কয়টি কমেন্ট আছে তার অপ্টিমাইজড কাউন্ট
} as const;

/**
 * ============================================================================
 * ১. listTickets() - ফিল্টারিং, সার্চ এবং প্রায়োরিটাইজড টিকিট লিস্ট
 * ============================================================================
 * 
 * [কাজ / Purpose]: 
 * হেল্পডেস্ক ড্যাশবোর্ড ও টিকিট টেবিলে সার্চ, স্ট্যাটাস, প্রায়োরিটি ও এজেন্ট ভিত্তিক টিকিট ফেচ করে।
 * 
 * [ডিজাইন সিদ্ধান্ত / Technical Highlights]:
 * - Dynamic SQL Filtering: স্প্রেড অপারেটর (...(filters.x ? {...} : {})) দিয়ে ডাইনামিক হোয়্যার ক্লজ।
 * - Case-Insensitive Search: 'mode: insensitive' ব্যবহার করে সাবজেক্ট ও টিকিটের নাম্বার (যেমন: TKT-0001) এ সার্চ।
 * - Intelligent Ordering: 
 *   ১ম প্রায়োরিটি: { status: "asc" } -> OPEN ও IN_PROGRESS টিকিটগুলো আগে আসবে।
 *   ২য় প্রায়োরিটি: { dueAt: "asc" } -> যে টিকিটের SLA ডেডলাইন সবচেয়ে কাছে, সেটি সবার উপরে থাকবে।
 * - Query Capping: 'take: 100' দিয়ে বড় ডেটাসেটে মেমরি ক্র্যাশ বা স্লো কোয়েরি প্রতিরোধ করা হয়েছে।
 */
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
    take: 100, // DoS ও মেমরি ওভারফ্লো ঠেকাতে একবারে সর্বোচ্চ ১০০ টিকিট লিমিট
  });
}

/**
 * ============================================================================
 * ২. getTicket() - একটি নির্দিষ্ট টিকিটের পূর্ণাঙ্গ হিস্ট্রি ও ডিটেইলস
 * ============================================================================
 * 
 * [কাজ / Purpose]: 
 * একটি টিকিটের যাবতীয় তথ্য, অ্যাসোসিয়েটেড ক্যাটাগরি, কমেন্ট লিস্ট এবং টাইমলাইন অডিট অ্যাক্টিভিটি ফেচ করে।
 * 
 * [টেকনিক্যাল দিক]:
 * - কমেন্ট ও অ্যাক্টিভিটি 'createdAt: asc' অর্ডারে লোড হয়, যাতে ইউজার পুরো টাইমলাইন ক্রমানুসারে দেখে।
 * - টিকিট না পাওয়া গেলে স্ট্যান্ডার্ড 404 HttpError থ্রো করা হয়।
 */
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

/**
 * ============================================================================
 * ৩. getDashboardCounts() - রিয়েল-টাইম ড্যাশবোর্ড মেট্রিক্স ও SLA ভায়োলেশন কাউন্ট
 * ============================================================================
 * 
 * [কাজ / Purpose]: ড্যাশবোর্ডের টপ স্ট্যাটাস কার্ডগুলোর জন্য কাউন্টার প্রস্তুত করে।
 * 
 * [পারফরম্যান্স অপ্টিমাইজেশন / Performance Optimization]:
 * - 'Promise.all' ব্যবহার করে ৫টি কাউন্ট কোয়েরি সমান্তরালে (Parallel) এক্সেস করা হয়েছে।
 *   এতে নেটওয়ার্ক লেটেন্সি ৫ গুণ কমে গিয়ে সিঙ্গেল রাউন্ড-ট্রিপের সমতুল্য দ্রুত রেসপন্স দেয়।
 * 
 * [SLA Overdue লজিক / SLA Breach Logic]:
 * Overdue টিকিট শর্ত: 
 * ১. dueAt < বর্তমান সময় (Date.now())
 * ২. status NOT IN ["RESOLVED", "CLOSED"]
 * কারণ: অলরেডি সলভড বা ক্লোজড টিকিট কখনোই ওভারডিউ (Overdue) হতে পারে না।
 */
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

// কনকারেন্ট টিকিট তৈরির সময় নাম্বার কলিশন হলে সর্বোচ্চ ৩ বার রিট্রাই করা হবে
const MAX_NUMBER_ATTEMPTS = 3;

/**
 * ============================================================================
 * ৪. createTicket() - স্বয়ংক্রিয় SLA, স্মার্ট লোড ব্যালেন্সিং ও AI ট্রায়াজ সহ টিকিট তৈরি
 * ============================================================================
 * 
 * [কাজ / Purpose]: 
 * একটি নতুন টিকিট তৈরি করে, তার জন্য SLA ডেডলাইন নির্ধারণ করে, সবচেয়ে কম লোড থাকা 
 * সাপোর্টিং এজেন্টের কাছে স্বয়ংক্রিয়ভাবে অ্যাসাইন করে এবং AI দিয়ে ক্যাটাগরি অনুমান করে।
 * 
 * [ধাপসমূহ / Execution Lifecycle]:
 * ১. ক্যাটাগরি ভ্যালিডেশন ও SLA নির্ণয়:
 *    - ক্যাটাগরি টেবিল থেকে defaultSlaHours নিয়ে calculateDueAt() দিয়ে সার্ভার ঘড়ির 
 *      টাইমস্ট্যাম্পে ডেডলাইন লক করা হয়। ক্লায়েন্ট কখনোই ফেক ডেডলাইন পাঠাতে পারে না।
 * 
 * ২. স্মার্ট লোড ব্যালেন্সিং (Fair Workload Distribution):
 *    - সকল 'AGENT' রোলের ইউজারকে ফেচ করা হয়।
 *    - শুধুমাত্র একটিভ টিকিট (OPEN + IN_PROGRESS) কাউন্ট করা হয় (RESOLVED বাদ)।
 *    - যার একটিভ টিকিট সবচেয়ে কম, তাকে এই টিকিটের assignedToId দেওয়া হয়।
 * 
 * ৩. Non-blocking AI Triage (AI ব্যর্থতা হ্যান্ডলিং):
 *    - classifyTicket() ফাংশনে OpenAI-কম্প্যাটিবল API কল করা হয়।
 *    - try/catch ব্লকে মোড়ানো, যাতে AI সার্ভার ডাউন থাকলে বা টাইমআউট হলেও 
 *      গ্রাহকের টিকিট তৈরি যাতে কখনোই ফেইল না করে (Zero Downtime Graceful Degradation)।
 * 
 * ৪. কনকারেন্সি ও Race Condition হ্যান্ডলিং (P2002 Retry Loop):
 *    - একই সেকেন্ডে একাধিক ইউজার টিকিট বানালে 'TKT-0005' ডুপ্লিকেট হতে পারে।
 *    - PostgreSQL-এর Unique Constraint violation (P2002) ক্যাচ করে লুপটি সর্বোচ্চ 
 *      MAX_NUMBER_ATTEMPTS বার রিট্রাই করে নতুন নাম্বার জেনারেট করে।
 *    - সেশন ইউজার ইতিমধ্যে ডিলিট হয়ে থাকলে Foreign Key Violation (P2003) ক্যাচ করে 401 রিটার্ন করে।
 * 
 * ৫. অ্যাটমিক অডিট লগ (Activity Log Ingestion):
 *    - টিকিট সৃষ্টির সাথেই Nested Relation এর মাধ্যমে "TICKET_CREATED" অ্যাক্টিভিটি রেকর্ড হয়।
 */
export async function createTicket(
  input: CreateTicketInput,
  actorId: string,
): Promise<{ id: string }> {
  // ধাপ ১: ক্যাটাগরি এবং তার নির্ধারিত SLA আওয়ার্স ফেচ করা
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true, name: true, defaultSlaHours: true },
  });

  if (!category) {
    throw new HttpError(404, "Category not found");
  }

  // সার্ভারের বর্তমান সময় ও ক্যাটাগরির SLA ঘন্টা দিয়ে ডিউ ডেট নির্ধারণ (ইমিউটেবল ও ক্লায়েন্ট ট্যাম্পারিং মুক্ত)
  const dueAt = calculateDueAt(new Date(), category.defaultSlaHours);

  // ধাপ ২: স্মার্ট লোড ব্যালেন্সিং - সব এজেন্টের বর্তমান পেন্ডিং কাজের চাপ যাচাই
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

  // সর্বনিম্ন পেন্ডিং টিকিট থাকা এজেন্টকে প্রথম পজিশনে আনা হলো
  agents.sort((a, b) => a._count.assignedTickets - b._count.assignedTickets);
  const assignedToId = agents[0]?.id ?? null;

  // ধাপ ৩: AI ট্রায়াজ - টিকিট কনটেন্ট অ্যানালাইসিস
  let aiCategory: string | null = null;
  let aiConfidence: number | null = null;
  try {
    const ai = await classifyTicket(input.subject, input.description);
    aiCategory = ai.category;
    aiConfidence = ai.confidence;
  } catch {
    // AI সার্ভার ফেইল করলে বা নেটওয়ার্ক এরর দিলে সাইলেন্টলি ফলব্যাক হবে
    aiCategory = null;
    aiConfidence = null;
  }

  // ধাপ ৪: ইউনিক টিকিট নাম্বার জেনারেশন ও কনকারেন্সি রিট্রাই লুপ
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
          // ইউজার যে ক্যাটাগরি চুজ করেছে তার সাথে AI অনুমানের মিল থাকলে ট্রু হবে
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
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2003: Foreign Key Error (actorId ডাটাবেজে না থাকলে)
        if (error.code === "P2003") {
          throw new HttpError(
            401,
            "Your session is no longer valid. Sign in again.",
          );
        }

        // P2002: Unique constraint violation on ticket number -> রিট্রাই করা হচ্ছে
        if (error.code === "P2002" && attempt < MAX_NUMBER_ATTEMPTS) continue;
      }

      // অন্য যেকোনো অনাকাঙ্ক্ষিত এরর বাইরে থ্রো করে দেওয়া হলো
      throw error;
    }
  }
}

/**
 * ============================================================================
 * ৫. transitionStatus() - স্টেট মেশিন ও রেজোলিউশন গার্ড অনুযায়ী স্ট্যাটাস পরিবর্তন
 * ============================================================================
 * 
 * [কাজ / Purpose]: 
 * একটি টিকিটের স্ট্যাটাস পরিবর্তন করে (যেমন: OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED)।
 * 
 * [সিকিউরিটি ও আর্কিটেকচারাল রুলস / Business Rules]:
 * ১. ফ্রেশ ডাটাবেজ স্টেট রিড: ক্লায়েন্ট কী পাঠালো তা বিশ্বাস না করে সরাসরি DB থেকে কারেন্ট স্ট্যাটাস চেক।
 * ২. নো-অপারেশন ডিটেকশন: কারেন্ট স্ট্যাটাস এবং নেক্সট স্ট্যাটাস এক হলে অপ্রয়োজনীয় রাইট বন্ধ (422 Unprocessable)।
 * ৩. স্টেট মেশিন ভ্যালিডেশন: 'isTransitionAllowed()' দিয়ে নিষিদ্ধ মুভমেন্ট আটকানো হয়।
 *    (উদাহরণ: CLOSED টিকিট থেকে কখনোই নতুন স্ট্যাটাসে যাওয়া সম্ভব নয়)।
 * ৪. কোয়ালিটি গার্ড (Public Reply Enforcement):
 *    - টিকিট 'RESOLVED' করতে হলে এজেন্টের অন্তত ১টি পাবলিক রিপ্লাই (isInternal: false) থাকতেই হবে।
 *    - এটি নিশ্চিত করে যে কাস্টমারকে সমাধান না জানিয়ে এজেন্ট টিকিট সলভ করতে পারবে না!
 * ৫. resolvedAt টাইমস্ট্যাম্প ম্যানেজমেন্ট:
 *    - RESOLVED হলে বর্তমান সময় সেট হয়।
 *    - CLOSED হলে পূর্বের রেজোলিউশন টাইম অক্ষত থাকে।
 *    - রি-ওপেন করা হলে resolvedAt আবার null রিসেট হয়।
 * ৬. অডিট ট্রেইল: একই ট্রানজিশনে ActivityLog এ 'STATUS_CHANGED' রেকর্ড সেভ হয়।
 */
export async function transitionStatus(
  ticketId: string,
  nextStatus: Status,
  actorId: string,
): Promise<{ id: string }> {
  // ডাটাবেজের বর্তমান স্ট্যাটাস যাচাই
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, status: true, resolvedAt: true },
  });

  if (!ticket) throw new HttpError(404, "Ticket not found");

  // একই স্ট্যাটাসে রূপান্তরের চেষ্টা প্রতিহত করা
  if (ticket.status === nextStatus) {
    throw new HttpError(422, `Ticket is already ${nextStatus}`);
  }

  // স্টেট মেশিনের অনুমোদিত নিয়মের বাইরে ট্রানজিশন ব্লক করা
  if (!isTransitionAllowed(ticket.status, nextStatus)) {
    throw new HttpError(
      422,
      `Cannot move a ticket from ${ticket.status} to ${nextStatus}`,
    );
  }

  // রেজোলিউশন গার্ড: কাস্টমারকে কোনো পাবলিক মেসেজ দেওয়া হয়েছে কি না যাচাই
  if (nextStatus === "RESOLVED") {
    const publicReplies = await prisma.comment.count({
      where: { ticketId, isInternal: false },
    });

    if (!canResolve(publicReplies)) {
      throw new HttpError(
        422,
        "Add a public reply before resolving — the customer needs to see what fixed it.",
      );
    }
  }

  // রেজোলিউশন টাইমস্ট্যাম্প লজিক
  const resolvedAt =
    nextStatus === "RESOLVED"
      ? new Date()
      : nextStatus === "CLOSED"
        ? ticket.resolvedAt
        : null;

  // টিকিট আপডেট এবং অ্যাক্টিভিটি লগ একসাথে তৈরি
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

/**
 * ============================================================================
 * ৬. addComment() - অ্যাটমিক কমেন্ট ইনসার্ট এবং অডিট ট্রেইল সংরক্ষণ
 * ============================================================================
 * 
 * [কাজ / Purpose]: 
 * টিকিটে পাবলিক রিপ্লাই অথবা ইন্টারনাল নোট (Internal Note) যোগ করে।
 * 
 * [আর্কিটেকচারাল দিক / ACID Transaction]:
 * - 'prisma.$transaction' ব্যবহার করা হয়েছে।
 *   কমেন্ট তৈরি হওয়া এবং অ্যাক্টিভিটি লগে 'COMMENT_ADDED' এন্ট্রি হওয়া—দুটোই 
 *   একটি অবিভাজ্য (Atomic) অপারেশনে ঘটে। একটি ফেইল করলে অন্যটিও রোলব্যাক হবে।
 * - ইন্টারনাল নোট শুধুমাত্র এজেন্টদের জন্য দৃশ্যমান, যা গ্রাহক দেখতে পায় না।
 */
export async function addComment(
  ticketId: string,
  authorId: string,
  body: string,
  isInternal: boolean,
) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new HttpError(404, "Ticket not found");

  try {
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
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new HttpError(
        401,
        "Your session is no longer valid. Sign in again.",
      );
    }

    throw error;
  }
}
