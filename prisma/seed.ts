import { PrismaPg } from "@prisma/adapter-pg";
import { Priority, PrismaClient, Role, Status } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { classifyTicket } from "../src/services/ai.service";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const HOUR = 60 * 60 * 1000;
const NOW = Date.now();
const hoursAgo = (h: number) => new Date(NOW - h * HOUR);

const CATEGORIES = [
  { name: "Billing", defaultSlaHours: 4 },
  { name: "Technical", defaultSlaHours: 12 },
  { name: "Account", defaultSlaHours: 24 },
  { name: "Feature Request", defaultSlaHours: 72 },
  { name: "Other", defaultSlaHours: 48 },
];

type TicketSeed = {
  subject: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  createdHoursAgo: number;
  assignee: number | null;
  publicReply?: string;
  internalNote?: string;
};

const TICKETS: TicketSeed[] = [
  {
    subject: "Duplicate charge on September invoice",
    description:
      "We were billed twice for the same subscription period. Invoice #INV-2291 and #INV-2292 both cover September. Please refund the duplicate.",
    category: "Billing",
    priority: Priority.HIGH,
    status: Status.OPEN,
    createdHoursAgo: 30,
    assignee: 0,
  },
  {
    subject: "Refund not received after 10 days",
    description:
      "The refund was approved on the 6th but nothing has reached our account yet. We need the transaction reference to chase it with our bank.",
    category: "Billing",
    priority: Priority.URGENT,
    status: Status.IN_PROGRESS,
    createdHoursAgo: 2,
    assignee: 1,
    internalNote: "Waiting on the payout report — chased finance this morning.",
  },
  {
    subject: "Cannot reset password, reset email never arrives",
    description:
      "I have requested a password reset four times today. The confirmation page appears but no email arrives, and it is not in spam either.",
    category: "Account",
    priority: Priority.URGENT,
    status: Status.IN_PROGRESS,
    createdHoursAgo: 6,
    assignee: 0,
  },
  {
    subject: "Dashboard fails to load on Safari 17",
    description:
      "The main dashboard shows a blank white page on Safari 17.2. The browser console reports a syntax error in one of the bundled chunks.",
    category: "Technical",
    priority: Priority.HIGH,
    status: Status.IN_PROGRESS,
    createdHoursAgo: 20,
    assignee: 1,
    internalNote: "Reproduced. Looks like an unsupported optional-chaining transform.",
  },
  {
    subject: "Export to CSV drops the last row",
    description:
      "When exporting more than 50 rows, the final record is missing from the downloaded file. Reproducible every time with our dataset.",
    category: "Technical",
    priority: Priority.MEDIUM,
    status: Status.OPEN,
    createdHoursAgo: 8,
    assignee: null,
  },
  {
    subject: "Invoice PDF shows the wrong VAT rate",
    description:
      "Our invoices print VAT at 15% but the correct rate for our region is 20%. This has been wrong on the last three invoices.",
    category: "Billing",
    priority: Priority.HIGH,
    status: Status.RESOLVED,
    createdHoursAgo: 26,
    assignee: 2,
    publicReply:
      "Confirmed — the tax profile on your account was set to the old region. I have corrected it and reissued all three invoices. The new PDFs are in your billing history.",
  },
  {
    subject: "Two-factor codes rejected on mobile",
    description:
      "Authenticator codes are rejected on my phone but work on my laptop. Both devices show the same clock. This started after the last update.",
    category: "Account",
    priority: Priority.HIGH,
    status: Status.RESOLVED,
    createdHoursAgo: 10,
    assignee: 0,
    publicReply:
      "The mobile app was caching an old TOTP secret. Reinstalling the app and re-scanning the QR code fixes it — I have reset your 2FA enrolment so you can do that now.",
  },
  {
    subject: "Add dark mode to the dashboard",
    description:
      "Several of our agents work late shifts and the bright interface is hard on the eyes. A dark theme toggle would help a lot.",
    category: "Feature Request",
    priority: Priority.LOW,
    status: Status.OPEN,
    createdHoursAgo: 40,
    assignee: null,
  },
  {
    subject: "Bulk assign tickets to an agent",
    description:
      "We need to select multiple tickets and assign them in one action. Right now we open each ticket individually, which takes hours during a backlog.",
    category: "Feature Request",
    priority: Priority.MEDIUM,
    status: Status.IN_PROGRESS,
    createdHoursAgo: 30,
    assignee: 1,
  },
  {
    subject: "API returns 500 when subject exceeds 255 characters",
    description:
      "Posting a ticket with a long subject returns an unhandled 500 instead of a validation error. We only discovered this because our integration retried 40 times.",
    category: "Technical",
    priority: Priority.HIGH,
    status: Status.RESOLVED,
    createdHoursAgo: 18,
    assignee: 2,
    publicReply:
      "Fixed. The subject field is now validated before it reaches the database, so an over-length subject returns a 422 with a clear message instead of a 500.",
  },
  {
    subject: "Change email address on account",
    description:
      "Our finance contact has left the company. Please move the account email to the new address on file.",
    category: "Account",
    priority: Priority.LOW,
    status: Status.CLOSED,
    createdHoursAgo: 60,
    assignee: 0,
    publicReply:
      "The account email has been updated and a confirmation was sent to both the old and new addresses. Closing this ticket.",
  },
  {
    subject: "Where can I download my invoices?",
    description:
      "I need PDF copies of all invoices from this year for our accountant. I could not find a download option anywhere in the settings.",
    category: "Billing",
    priority: Priority.LOW,
    status: Status.CLOSED,
    createdHoursAgo: 80,
    assignee: 1,
    publicReply:
      "Invoices are under Settings → Billing → Invoice history. There is a 'Download all' button at the top right that exports a single ZIP for the year.",
  },
  {
    subject: "Login loop after password change",
    description:
      "After changing my password I am redirected back to the login page every time. The credentials are definitely correct because the first attempt works.",
    category: "Account",
    priority: Priority.URGENT,
    status: Status.OPEN,
    createdHoursAgo: 30,
    assignee: 2,
    internalNote: "Suspect a stale session cookie still carrying the old token version.",
  },
  {
    subject: "Search does not find tickets by number",
    description:
      "Searching for TKT-0007 returns nothing, but searching for the subject text finds it. Our team works almost entirely from ticket numbers.",
    category: "Technical",
    priority: Priority.MEDIUM,
    status: Status.OPEN,
    createdHoursAgo: 5,
    assignee: null,
  },
  {
    subject: "Add Slack notifications",
    description:
      "It would save our team a lot of time if new urgent tickets posted straight into our Slack channel instead of relying on email.",
    category: "Feature Request",
    priority: Priority.MEDIUM,
    status: Status.OPEN,
    createdHoursAgo: 50,
    assignee: null,
  },
  {
    subject: "Attachment upload fails over 5MB",
    description:
      "Any file larger than about 5MB fails with a generic error. Screenshots from our QA team routinely exceed that size.",
    category: "Technical",
    priority: Priority.HIGH,
    status: Status.IN_PROGRESS,
    createdHoursAgo: 14,
    assignee: 0,
  },
  {
    subject: "Request: export activity log",
    description:
      "We need the activity log in CSV form for our quarterly audit. Viewing it on screen is useful but not enough for compliance.",
    category: "Feature Request",
    priority: Priority.LOW,
    status: Status.CLOSED,
    createdHoursAgo: 100,
    assignee: 1,
    publicReply:
      "Activity export is now available from the ticket detail page under the log section. It exports CSV for the selected date range.",
  },
  {
    subject: "Payment method declined but card is valid",
    description:
      "Our corporate card was declined twice this morning. The bank confirms no block on their side and the card works elsewhere.",
    category: "Billing",
    priority: Priority.URGENT,
    status: Status.IN_PROGRESS,
    createdHoursAgo: 1,
    assignee: 2,
  },
  {
    subject: "Can we get a monthly summary email?",
    description:
      "A short monthly email with ticket volumes and average resolution time would help us report upwards without logging in.",
    category: "Other",
    priority: Priority.LOW,
    status: Status.OPEN,
    createdHoursAgo: 20,
    assignee: null,
  },
  {
    subject: "Slow response on ticket list page",
    description:
      "The ticket list takes six to eight seconds to load once we passed a few thousand tickets. Filtering by status is noticeably slower.",
    category: "Technical",
    priority: Priority.MEDIUM,
    status: Status.RESOLVED,
    createdHoursAgo: 16,
    assignee: 1,
    publicReply:
      "The list query was doing a full scan because status was not indexed. Added an index on status and the response is now under 300ms for your dataset.",
  },
];

async function main() {
  console.log("Clearing existing data...");
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding categories...");
  const categoryMap = new Map<string, { id: string; defaultSlaHours: number }>();
  for (const c of CATEGORIES) {
    const created = await prisma.category.create({ data: c });
    categoryMap.set(created.name, {
      id: created.id,
      defaultSlaHours: created.defaultSlaHours,
    });
  }

  console.log("Seeding users...");
  const adminHash = await bcrypt.hash("Admin@2026", 10);
  const agentHash = await bcrypt.hash("Agent@2026", 10);

  await prisma.user.create({
    data: {
      email: "admin@deskflow.dev",
      name: "Mohammad Ali",
      role: Role.ADMIN,
      passwordHash: adminHash,
    },
  });

  const agentSeeds = [
    { email: "agent@deskflow.dev", name: "Nusrat Jahan" },
    { email: "agent2@deskflow.dev", name: "Tanvir Ahmed" },
    { email: "agent3@deskflow.dev", name: "Sadia Islam" },
  ];

  const agents = [];
  for (const a of agentSeeds) {
    agents.push(
      await prisma.user.create({
        data: { ...a, role: Role.AGENT, passwordHash: agentHash },
      }),
    );
  }

  console.log("Seeding tickets...");
  let index = 0;

  for (const t of TICKETS) {
    index += 1;
    const category = categoryMap.get(t.category);
    if (!category) throw new Error(`Unknown category: ${t.category}`);

    const createdAt = hoursAgo(t.createdHoursAgo);

    const dueAt = new Date(
      createdAt.getTime() + category.defaultSlaHours * HOUR,
    );

    const isFinished =
      t.status === Status.RESOLVED || t.status === Status.CLOSED;

    const resolvedAt = isFinished
      ? new Date(
          Math.min(
            createdAt.getTime() + category.defaultSlaHours * 0.7 * HOUR,
            NOW - HOUR,
          ),
        )
      : null;

    const assignee = t.assignee === null ? null : agents[t.assignee];

    const ai = await classifyTicket(t.subject, t.description);

    const ticket = await prisma.ticket.create({
      data: {
        number: `TKT-${String(index).padStart(4, "0")}`,
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        categoryId: category.id,
        createdById: assignee?.id ?? agents[0].id,
        assignedToId: assignee?.id ?? null,
        dueAt,
        resolvedAt,
        aiCategory: ai.category,
        aiConfidence: ai.confidence,
        aiAccepted: ai.category === t.category,
        createdAt,
        updatedAt: resolvedAt ?? createdAt,
      },
    });

    await prisma.activityLog.create({
      data: {
        ticketId: ticket.id,
        actorId: ticket.createdById,
        action: "TICKET_CREATED",
        toValue: Status.OPEN,
        createdAt,
      },
    });

    if (t.status !== Status.OPEN) {
      await prisma.activityLog.create({
        data: {
          ticketId: ticket.id,
          actorId: assignee?.id ?? null,
          action: "STATUS_CHANGED",
          fromValue: Status.OPEN,
          toValue: t.status,
          createdAt: resolvedAt ?? new Date(createdAt.getTime() + HOUR),
        },
      });
    }

    if (t.publicReply) {
      await prisma.comment.create({
        data: {
          ticketId: ticket.id,
          authorId: assignee?.id ?? agents[0].id,
          body: t.publicReply,
          isInternal: false,
          createdAt: resolvedAt ?? new Date(createdAt.getTime() + HOUR),
        },
      });
    }

    if (t.internalNote) {
      await prisma.comment.create({
        data: {
          ticketId: ticket.id,
          authorId: assignee?.id ?? agents[0].id,
          body: t.internalNote,
          isInternal: true,
          createdAt: new Date(createdAt.getTime() + 0.5 * HOUR),
        },
      });
    }
  }

  const counts = {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    tickets: await prisma.ticket.count(),
    comments: await prisma.comment.count(),
    activityLogs: await prisma.activityLog.count(),
  };

  console.log("Done:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
