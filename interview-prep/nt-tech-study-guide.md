# DeskFlow — সম্পূর্ণ স্টাডি গাইড

> নিজের প্রজেক্ট আবার শেখার জন্য। Interview: ২ নভেম্বর ২০২৬, বিকেল ৪টা, রাজশাহী।

---

## 0. এই গাইড কীভাবে পড়বে

| কখন | কী পড়বে | উদ্দেশ্য |
| --- | --- | --- |
| আজ রাত (২৯ অক্টো) | পার্ট ১–৫ | **বোঝা** — মুখস্থ না, ছবিটা মাথায় বসানো |
| কাল (৩০ অক্টো) | পার্ট ৬–৭ | **মুখস্থ + জোরে বলা** |
| পরশু (৩১ অক্টো) | পার্ট ৭ আবার | প্র্যাকটিস, টাইমার দিয়ে |
| যাওয়ার পথে | পার্ট ৬ + ৮ | ৩০ মিনিটের রিভিশন |

**নিয়ম:** মুখস্থ না। প্রতিটা জিনিসের পিছনে "কেন" খোঁজো। Interviewer যা-ই জিজ্ঞেস করুক, "কেন" জানলে উত্তর নিজেই বের হয়ে আসবে।

---

# পার্ট ১ — SLA আসলে কী?

## ১.১ এক লাইনে

**SLA = Service Level Agreement = "আমি তোমাকে কতক্ষণে সাড়া দেব" — এই লিখিত প্রতিশ্রুতি।**

## ১.২ চেনা উদাহরণ

- পিৎজার দোকান: "৩০ মিনিটে ডেলিভারি, নাহলে ফ্রি"
- ইলেকট্রিসিয়ান: "কল দেওয়ার ২ ঘণ্টার মধ্যে পৌঁছে যাব"
- ব্যাংক: "লোন আবেদন ৭ কর্মদিবসে নিষ্পত্তি"
- ISP: "৯৯.৫% uptime গ্যারান্টি"

সবগুলোই SLA। মূল কথা একটাই: **সময়ের প্রতিশ্রুতি, আর প্রতিশ্রুতি ভাঙলে পরিণতি**।

## ১.৩ সাপোর্ট ডেস্কে SLA-র তিন রকম

| ধরন | মানে | উদাহরণ |
| --- | --- | --- |
| **First response time** | প্রথম উত্তর দিতে কত সময় | "১ ঘণ্টার মধ্যে রিপ্লাই পাবেন" |
| **Resolution time** | সমস্যা সমাধান করতে কত সময় | "২৪ ঘণ্টায় ঠিক করে দেব" |
| **Availability / uptime** | সার্ভিস কত % চালু থাকবে | "৯৯.৯% uptime" |

**তোমার প্রজেক্টে কোনটা?** → **Resolution time**।
`Ticket.dueAt` ফিল্ডটাই হলো সেই প্রতিশ্রুতির শেষ সময়।

## ১.৪ কোডে কোথায়

`prisma/schema.prisma`:

```prisma
model Category {
  name            String @unique
  defaultSlaHours Int          // ← এখানেই SLA-র সংখ্যা
}
```

`src/services/sla.service.ts` — পুরো ফাইল:

```ts
export function calculateDueAt(createdAt: Date, slaHours: number): Date {
    const d = new Date(createdAt);
    d.setHours(d.getHours() + slaHours);
    return d;
}
```

**মাত্র ৫ লাইন।** কিন্তু এই ৫ লাইনই পুরো সিস্টেমের ঘড়ি।

**কেন এত ছোট ফাংশন আলাদা ফাইলে?**
কারণ এটা একটা **pure function** — ইনপুট দিলে আউটপুট, ভেতরে কোনো DB, network বা `Date.now()` নেই। ফলে:
- টেস্ট করা সহজ (mock লাগে না)
- ভুল হলে সাথে সাথে ধরা পড়ে
- অন্য জায়গায় reuse করা যায়

`new Date(createdAt)` দিয়ে **কপি** বানানো হয়েছে — মূল ডেটটা mutate হয় না। এটাও টেস্টে চেক করা আছে ("does not mutate the date it was given")।

## ১.৫ ঘড়িটা কে চালায় — সার্ভার, ব্রাউজার না

`createTicket()`-এ:

```ts
const dueAt = calculateDueAt(new Date(), category.defaultSlaHours);
```

এই `new Date()` চলছে **সার্ভারে**, ব্রাউজারে না।

**কেন এটা গুরুত্বপূর্ণ?** ব্রাউজারের ঘড়ি ইউজার নিজেই বদলাতে পারে (Windows-এ সময় পেছনে ঠেলে দিলেই "সময় আছে" দেখাবে)। SLA যদি ক্লায়েন্টের ঘড়িতে হিসাব হতো, যে কেউ সহজেই SLA ভাঙতে পারত। **সার্ভারের ঘড়ি = বিশ্বাসযোগ্য একমাত্র সত্য।**

## ১.৬ "Breach" আসলে কখন হয়

`getDashboardCounts()`-এ:

```ts
prisma.ticket.count({
  where: {
    dueAt: { lt: new Date() },                      // ১. ডেডলাইন পেরিয়েছে
    status: { notIn: ["RESOLVED", "CLOSED"] },      // ২. আর এখনো খোলা
  },
});
```

দুইটা শর্ত একসাথে:

1. ডেডলাইন পেরিয়ে গেছে (`dueAt < now`)
2. টিকেটটা এখনো `OPEN` বা `IN_PROGRESS`

অর্থাৎ **টিকেট resolve বা close হয়ে গেলে ঘড়ি থেমে যায়**। ৩ দিন পরে close করলেও সেটা "বর্তমান breach" হিসেবে গণ্য হয় না — কারণ সমস্যাটা তো একসময় সমাধান হয়েছে।

## ১.৭ UI-তে কেমন দেখায়

`src/lib/format.ts` → `dueLabel()`:

| অবস্থা | দেখায় | রঙ |
| --- | --- | --- |
| ডেডলাইন বাকি | `in 3h` / `in 2d` | ধূসর |
| ডেডলাইন পার | `5h overdue` / `2d overdue` | **লাল** |
| RESOLVED / CLOSED | শুধু তারিখ | ধূসর (ঘড়ি থেমে গেছে) |

`SLA_STOPPED = new Set(["RESOLVED", "CLOSED"])` — এই ছোট সেটটাই ঠিক করে দেয় কখন লাল দেখাবে আর কখন না।

## ১.৮ কেন SLA ব্যবসার জন্য জরুরি

1. **অগ্রাধিকার ঠিক করে** — `orderBy: [{ status: "asc" }, { dueAt: "asc" }]`। মানে: আগে খোলা কাজ, তার মধ্যে যার ডেডলাইন সবচেয়ে নিকটে সে সবার উপরে।
2. **জবাবদিহি তৈরি করে** — dashboard-এ "SLA breaches" কার্ড। ম্যানেজার এক নজরে দেখে টিম ঠিক আছে কিনা।
3. **চুক্তি রক্ষা করে** — B2B SaaS-এ SLA ভাঙলে penalty, credit, এমনকি ক্লায়েন্ট হারানো।

## ১.৯ তিনটা দুর্বলতা — নিজেই বলে দাও ⭐

Interviewer জিজ্ঞেস করার আগেই বললে বিশাল পয়েন্ট। এগুলো **তোমার প্রজেক্টের সীমাবদ্ধতা**, আর এগুলো স্বীকার করা দুর্বলতা না — পরিপক্বতা।

**১. Calendar hours, business hours না**
Billing-এর SLA ৪ ঘণ্টা। রাত ২টায় টিকেট এলে সকাল ৬টায় breach দেখাবে — যদিও অফিস বন্ধ ছিল। আসল প্রোডাক্টে **business calendar** লাগে: সোম–শুক্র ৯টা–৬টা, ছুটির দিন বাদ, টাইমজোন আলাদা।

**২. Breach-এর ইতিহাস রাখা হয় না**
এখন শুধু "এখন কে overdue" দেখায়। "এই মাসে কত % টিকেট SLA ভেঙেছে" — এই রিপোর্ট করা যায় না। সমাধান: `resolvedAt` আর `dueAt` তুলনা করে breach হিসাব করা, বা আলাদা `SlaBreach` টেবিল।

**৩. SLA শুধু category-নির্ভর, priority বা plan tier-নির্ভর না**
`URGENT` priority-র আলাদা SLA নেই। আসল সিস্টেমে SLA = f(category, priority, customer plan)। Enterprise কাস্টমার আর free ইউজারের SLA এক হয় না।

## ১.১০ SLA নিয়ে যেসব প্রশ্ন আসতে পারে

| প্রশ্ন | উত্তর |
| --- | --- |
| SLA কী? | সময়ের লিখিত প্রতিশ্রুতি। এই সিস্টেমে resolution time — `dueAt` |
| Breach কীভাবে গণনা করলে? | `dueAt < now` **এবং** status `RESOLVED`/`CLOSED` না |
| টাইমজোন? | DB-তে UTC (Postgres `timestamptz`), UI-তে `Intl.DateTimeFormat` দিয়ে লোকাল |
| Business hours হিসাব করেছ? | না — limitation, কীভাবে করতাম বলো |
| SLA বদলালে পুরনো টিকেটের কী হয়? | `dueAt` creation-এ stamp হয়ে যায়, তাই পুরনো টিকেট পুরনো SLA ধরে রাখে। **এটাই সঠিক** — চলমান চুক্তি মাঝপথে বদলায় না |
| Priority অনুযায়ী SLA আছে? | এখন নেই। `URGENT`-এ ১ ঘণ্টা দেওয়া যেত — next step |
| SLA কোথায় enforce হয়? | কোথাও "enforce" হয় না — এটা **পর্যবেক্ষণ**, বাধা না। Breach হলে টিকেট আটকে যায় না, শুধু লাল দেখায় ও গোনা হয় |

---

# পার্ট ২ — প্রজেক্টটা আসলে কী

## ২.১ এক বাক্যে (এটা মুখস্থ করো)

> **"DeskFlow হলো ছোট টিমের জন্য একটা সাপোর্ট ডেস্ক — যেখানে প্রতিটা টিকেটের একটা SLA ডেডলাইন থাকে, স্টেটাস ওয়ার্কফ্লো বাইপাস করা যায় না, আর টিকেট আসার সাথে সাথে AI ক্যাটাগরি সাজেস্ট করে।"**

## ২.২ কে কী করে

- **Requester** — টিকেট খোলে (subject, description, category, priority)
- **Agent** — টিকেট নেয়, রিপ্লাই দেয়, status বদলায়
- **Admin** — সব দেখে, dashboard-এ breach গোনে

## ২.৩ আটটা ফিচার — মনে রাখার ছন্দ

| # | ফিচার | কোথায় |
| --- | --- | --- |
| ১ | টিকেট (category, priority, requester, assignee) | `Ticket` model |
| ২ | SLA deadline (category-ভিত্তিক) | `sla.service.ts` |
| ৩ | Status machine (বাইপাস করা যায় না) | `ticket-rules.ts` |
| ৪ | Resolve guard (public reply ছাড়া resolve না) | `ticket.service.ts` |
| ৫ | AI triage (fallback সহ) | `ai.service.ts` |
| ৬ | Load-balanced assignment (যার কাজ সবচেয়ে কম) | `ticket.service.ts` |
| ৭ | Audit trail (activity log) | `ActivityLog` model |
| ৮ | Auth (bcrypt + JWT cookie) | `auth.ts`, `proxy.ts` |

**মনে রাখার ছন্দ:**
> টিকেট আসে → সময় বসে → নিয়ম মানে → AI বলে → কে পাবে ঠিক হয় → সব লগ হয় → কে দেখবে ঠিক হয়

## ২.৪ কেন এটা "আরেকটা CRUD app" না ⭐

CRUD app-এ নিয়ম থাকে UI-তে — বাটন লুকিয়ে দিলেই "নিয়ম" শেষ। এখানে তিনটা নিয়ম **সার্ভারে** বসানো:

1. **Status transition map** — `OPEN → RESOLVED` সরাসরি গেলে 422
2. **Resolve guard** — public reply ছাড়া resolve গেলে 422
3. **Ticket numbering race** — একসাথে দুই টিকেট এলে `P2002` → retry

এই তিনটা curl/Postman দিয়ে bypass করার চেষ্টা করলে আটকে যাবে। **এটাই তোমার প্রজেক্টের আসল মূল্য।**

---

# পার্ট ৩ — ফাইল ম্যাপ

কোন ফাইলে কী আছে, আর interview-এ কখন দেখাবে:

| ফাইল | কী করে | কখন দেখাবে |
| --- | --- | --- |
| `src/proxy.ts` | Edge middleware। JWT verify, না থাকলে `/api/*`→401, পেজ→`/login?next=` | "নিরাপত্তা কোথায় শুরু হয়" প্রশ্নে |
| `src/lib/auth.ts` | JWT sign/verify, cookie, `HttpError`, `toErrorResponse` | "auth কীভাবে" প্রশ্নে |
| `src/lib/db.ts` | Prisma singleton + `PrismaPg` adapter | "Prisma 7-এ কী আলাদা" প্রশ্নে |
| `src/lib/ticket-rules.ts` | transition map + `canResolve` — **pure, ১৪ লাইন** | ⭐ status machine প্রশ্নে |
| `src/services/sla.service.ts` | `calculateDueAt` — ৫ লাইন | ⭐ SLA প্রশ্নে |
| `src/services/ai.service.ts` | triage + keyword fallback | ⭐ AI প্রশ্নে |
| `src/services/ticket.service.ts` | CRUD + status machine + numbering retry + assignment | ⭐ যেকোনো গভীর প্রশ্নে |
| `src/lib/validation/ticket.ts` | সব Zod schema | "validation কোথায়" প্রশ্নে |
| `src/app/api/**/route.ts` | thin handler: auth → Zod → service → JSON | "API design" প্রশ্নে |
| `src/app/(app)/**/page.tsx` | Server Components, Suspense দিয়ে stream | "rendering strategy" প্রশ্নে |
| `prisma/schema.prisma` | ৫টা মডেল | DB প্রশ্নে |
| `tests/ticket-rules.test.ts` | ২১টা test case | "টেস্ট করেছ?" প্রশ্নে |

**সোনার নিয়ম:** কোনো প্রশ্নে আটকে গেলে বলো *"let me show you"* — এবং `ticket-rules.ts` বা `sla.service.ts` খুলে দাও। ছোট ফাইল, পড়তে ১০ সেকেন্ড। এতে বোঝায় তুমি কোড চেনো।

---

# পার্ট ৪ — ডেটাবেস (৫টা টেবিল)

```
        ┌──────────────┐
        │     User     │
        │ id, email    │
        │ passwordHash │
        │ name, role   │
        └──┬────┬───┬──┘
           │    │   │
   createdBy   │   assignedTo (nullable)
           │    │   │
           ▼    │   ▼
     ┌─────────────────────┐        ┌──────────────┐
     │       Ticket        │◄───────│   Category   │
     │ number (unique)     │  many  │ name (uniq)  │
     │ subject, description│   to   │ defaultSlaHr │
     │ status, priority    │  one   └──────────────┘
     │ dueAt, resolvedAt   │
     │ aiCategory          │
     │ aiConfidence        │
     │ aiAccepted          │
     └──────┬───────┬──────┘
            │       │
            ▼       ▼
     ┌──────────┐ ┌──────────────┐
     │ Comment  │ │ ActivityLog  │
     │ body     │ │ action       │
     │ isInternal│ │ from/toValue │
     └──────────┘ └──────────────┘
```

## ৪.১ প্রতিটা টেবিল কেন আছে

| টেবিল | কেন আলাদা |
| --- | --- |
| `User` | agent + admin, একই টেবিলে `role` দিয়ে আলাদা |
| `Category` | SLA ঘণ্টা **ডেটা**, কোডে hardcode না। নতুন ক্যাটাগরি = নতুন row, deploy লাগে না |
| `Ticket` | মূল সত্তা। `aiCategory/aiConfidence/aiAccepted` তিনটা ফিল্ড একসাথে AI-র "স্মৃতি" |
| `Comment` | `isInternal` ফ্ল্যাগ — পাবলিক রিপ্লাই আর ইন্টারনাল নোট একই টেবিলে |
| `ActivityLog` | **কে কখন কী করল** — অডিট ট্রেইল |

## ৪.২ সবচেয়ে বুদ্ধিমান সিদ্ধান্ত: `ActivityLog` আলাদা রাখা ⭐

প্রশ্ন আসতে পারে: *"status change-ও তো Comment-এ রাখা যেত, আলাদা টেবিল কেন?"*

কারণ: Comment হলো **কথা**, ActivityLog হলো **ঘটনা**। দুটোর life cycle আলাদা:
- Comment edit/delete হতে পারে (ভবিষ্যতে), ActivityLog কখনো নয় — অডিট ট্রেইল immutable
- Comment-এ `isInternal` অর্থবহ, ActivityLog-এ অর্থহীন
- একই টিকেটে ২০টা status change হতে পারে, সেগুলো "কথোপকথন" না

আর সবচেয়ে বড় কথা: **টিকেট পেজে "how it actually got resolved" দেখানো যায়** — কে খুলল, কে নিল, কে বদলাল, কে রিপ্লাই দিল — সময়ের ক্রমে।

## ৪.৩ ইনডেক্স কেন এই তিনটায়

```prisma
@@index([status])        // list filter: ?status=OPEN
@@index([assignedToId])  // assignment count query
@@index([dueAt])         // orderBy dueAt, breach count
```

এই তিনটাই সেই কলাম যেগুলো `WHERE`/`ORDER BY`-তে সবচেয়ে বেশি আসে। ইনডেক্স ছাড়া ১০ হাজার টিকেটে list page ধীরে হবে।

## ৪.৪ `number` কেন `@unique`

`TKT-0001` user-facing আইডি। `@unique` থাকার কারণে দুইটা একই নম্বর তৈরি হতে **পারে না** — DB নিজেই আটকে দেয় (`P2002` error)। এটাই race condition ধরার জাল।

---

# পার্ট ৫ — একটা টিকেটের জীবনকাহিনী

Interview-এ সবচেয়ে ভালো উত্তর হলো **একটা টিকেটের গল্প বলার মাধ্যমে পুরো সিস্টেম ব্যাখ্যা করা**। এই ৯ ধাপ মুখস্থ করো।

## ধাপ ১ — ক্লায়েন্ট POST করে

`NewTicketDialog` (client component) → `fetch("/api/tickets", { method: "POST" })`

## ধাপ ২ — Proxy আগে থামায়

`src/proxy.ts` (Edge runtime) — cookie-তে JWT আছে কিনা দেখে। না থাকলে `401`। **এখানে Prisma বা bcrypt নেই** — Edge-এ চলে না।

## ধাপ ৩ — Route handler: auth → validate

`src/app/api/tickets/route.ts`:

```ts
const user = await requireAuthFromRequest(request);   // কে?
const body = await request.json().catch(() => null);  // malformed JSON → null
const parsed = createTicketSchema.safeParse(body);    // Zod
if (!parsed.success) return 422;
```

**তিনটা স্তর আলাদা:** কে (auth) → কী পাঠিয়েছে (Zod) → কী করবে (service)। Handler-এ কোনো business logic নেই।

## ধাপ ৪ — Service: SLA ঘড়ি বসে

`createTicket()`:
```ts
const dueAt = calculateDueAt(new Date(), category.defaultSlaHours);
```
ক্যাটাগরি DB থেকে পড়া হয় — কারণ SLA সংখ্যাটা ডেটা, কোড না।

## ধাপ ৫ — Service: কে পাবে ঠিক হয়

```ts
const agents = await prisma.user.findMany({
  where: { role: "AGENT" },
  select: { id: true, _count: { select: { assignedTickets: {
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } }   // শুধু চলমান কাজ গোনে
  }}}},
});
agents.sort((a, b) => a._count.assignedTickets - b._count.assignedTickets);
const assignedToId = agents[0]?.id ?? null;
```

**নিয়ম:** যার কাছে সবচেয়ে কম **খোলা** টিকেট আছে সে পাবে।
`RESOLVED`/`CLOSED` গোনায় ধরা হয় না — নাহলে পুরনো কাজের বোঝা সারাজীবন ঘাড়ে থাকত।

## ধাপ ৬ — Service: AI সাজেশন (ব্যর্থ হলেও চলবে)

```ts
try {
  const ai = await classifyTicket(input.subject, input.description);
  aiCategory = ai.category;
  aiConfidence = ai.confidence;
} catch {
  aiCategory = null;   // ticket তবুও তৈরি হবে
  aiConfidence = null;
}
```

## ধাপ ৭ — Service: নম্বর দেওয়া + race handling ⭐

```ts
for (let attempt = 1; ; attempt += 1) {
  const count = await prisma.ticket.count();
  const number = `TKT-${String(count + 1).padStart(4, "0")}`;
  try {
    const ticket = await prisma.ticket.create({ data: { ... } });
    return { id: ticket.id };
  } catch (error) {
    if (error.code === "P2002" && attempt < 3) continue;   // আবার চেষ্টা
    throw error;
  }
}
```

**সমস্যাটা কী?** দুইটা request একসাথে এলে দুজনেই `count()` করে একই সংখ্যা পায় → একই `TKT-0005` → unique constraint ভাঙে।

**সমাধান:** `P2002` ধরা → নতুন count নিয়ে আবার চেষ্টা → সর্বোচ্চ ৩ বার।

**বিকল্প কী ছিল?** Postgres sequence। কিন্তু sequence-এ delete হলে গ্যাপ পড়ে (`0004` নেই, `0006` আছে) — user-facing নম্বরে সেটা অদ্ভুত দেখায়। এই trade-off-টা বলতে পারলে ভালো।

## ধাপ ৮ — একই transaction-এ audit log

```ts
data: {
  ...,
  activities: {
    create: { actorId, action: "TICKET_CREATED", toValue: "OPEN" },
  },
},
```

nested write — Prisma একই transaction-এ দুটো insert করে। **টিকেট তৈরি হয়েছে কিন্তু log নেই — এই অবস্থা সম্ভব না।**

## ধাপ ৯ — Status বদল (সবচেয়ে গুরুত্বপূর্ণ অংশ) ⭐⭐

`PATCH /api/tickets/:id` → `transitionStatus()`:

```
১. DB থেকে আসল status পড়ো        ← ক্লায়েন্টকে বিশ্বাস করো না
২. একই status? → 422 "already"
৩. isTransitionAllowed()? → না হলে 422
৪. RESOLVED? → public reply আছে? → না হলে 422
৫. update + activity log একসাথে
```

**কেন ধাপ ১ এত জরুরি?** কারণ ক্লায়েন্ট যা বলছে সেটা মিথ্যা হতে পারে। DB-র সত্যিটাই একমাত্র ভিত্তি। এটাই **server-side enforcement**।

## বোনাস — Reply যোগ করা

`addComment()` → `prisma.$transaction([comment.create(), activityLog.create()])`
দুটো আলাদা query, কিন্তু একসাথে সফল বা একসাথে ব্যর্থ।

---

# পার্ট ৬ — ইমার্জেন্সি কার্ড (৭ বাক্য মুখস্থ করো)

Interview-এ মাথা ফাঁকা হয়ে গেলে এই সাতটা বাক্য বলো। এতেই ২ মিনিট কেটে যাবে, আর তুমি ট্র্যাকে ফিরে আসবে।

1. **"DeskFlow is a support desk for small teams."**
2. **"Every ticket gets an SLA deadline calculated from its category — Billing is 4 hours, Technical 12, Account 24, Feature Request 72, Other 48."**
3. **"The status workflow is a state machine, and the rules live on the server — the UI only hides buttons, the API actually rejects illegal moves with a 422."**
4. **"A ticket can't be resolved until someone posts a public reply, because the customer needs to see what fixed it."**
5. **"AI triage is advisory — it suggests a category with a confidence score, but if the model is down or slow, keyword rules take over and the ticket is still created."**
6. **"New tickets go to the agent with the fewest open tickets, and every action is written to an activity log in the same transaction as the change."**
7. **"The biggest limitation is that SLA uses calendar hours, not business hours, and there's no pagination yet."**

শেষ বাক্যটা ইচ্ছে করেই সীমাবদ্ধতা দিয়ে শেষ — এতে মনে হয় তুমি নিজের কোডের সীমানা জানো।

---

# পার্ট ৭ — প্রশ্নব্যাংক

প্রতিটা প্রশ্নে: **এক লাইনে উত্তর** → **বিস্তারিত** → **follow-up**

---

## A. প্রজেক্ট ও প্রোডাক্ট

**A1. "Tell me about this project."**
> এক লাইনে: পার্ট ২.১-এর বাক্য।
> বিস্তারিত: পার্ট ৬-এর ৭ বাক্য। তারপর জিজ্ঞেস করো "কোন অংশটা বিস্তারিত বলব?"

**A2. "Why did you choose a help desk?"**
> কারণ এতে সত্যিকারের business rule আছে — CRUD না।
> বিস্তারিত: SLA, state machine, resolve guard — তিনটাই এমন নিয়ম যা UI-তে লুকানো যায় না, সার্ভারে enforce করতে হয়। এতে দেখানো যায় আমি শুধু CRUD লিখি না।

**A3. "What was the hardest part?"**
> সৎ উত্তর দাও। সম্ভবত Next 16-এর `cacheComponents` + Suspense।
> বিস্তারিত: build সময় GET handler-এ `cookies()` reject করে, তাই request header থেকে cookie পড়তে হয়েছে। আর `dynamic` route config পুরো reject হয়ে যায়, তাই সব কিছু Suspense boundary-তে রাখতে হয়েছে।

**A4. "What are you most proud of?"**
> Status machine + resolve guard, কারণ ওটা UI bypass করেও ভাঙা যায় না।

**A5. "What would you do differently?"**
> `number`-এর জন্য row count না নিয়ে আলাদা `TicketCounter` টেবিল বা DB sequence + display prefix। আর AI triage queue-তে সরাতাম।

**A6. "Who is this for?"**
> ছোট টিম (৫–২০ জন agent)। B2B SaaS কাস্টমার সাপোর্ট। Enterprise না — multi-tenant নেই।

---

## B. SLA (পার্ট ১ দেখো)

**B1. "What is an SLA?"** → পার্ট ১.১ + ১.৩
**B2. "How did you calculate the deadline?"** → `createdAt + defaultSlaHours`, সার্ভারের ঘড়িতে
**B3. "How do you detect a breach?"** → `dueAt < now AND status NOT IN (RESOLVED, CLOSED)`
**B4. "What about business hours?"** → স্বীকার করো: calendar hours; business calendar কীভাবে করতাম বলো
**B5. "Why stamp dueAt at creation instead of computing on read?"**
> কারণ SLA হলো চুক্তি। চুক্তি তৈরি হওয়ার মুহূর্তে তার শর্ত froze হয়ে যায়। পরে category-র SLA বদলালে পুরনো টিকেটের প্রতিশ্রুতি বদলানো উচিত না। আর read-এ হিসাব করলে প্রতিটা list query-তে join + calculation লাগত।
**B6. "Timezone?"** → DB-তে UTC, UI-তে `Intl.DateTimeFormat` লোকাল

---

## C. Status machine ও business rule

**C1. "Walk me through the status workflow."** → SVG-র ছবিটা মাথায় রেখে: OPEN → IN_PROGRESS → RESOLVED → CLOSED, reopen path সহ, CLOSED terminal।

**C2. "Where is that enforced?"** ⭐
> `src/lib/ticket-rules.ts`-এ একটা map, আর `transitionStatus()`-এ চেক।
> UI-তে `StatusControl` শুধু allowed গুলো দেখায় — কিন্তু ওটা **UX**, নিরাপত্তা না। আসল গার্ড API-তে।

**C3. "What if I call the API directly with curl?"**
> 422 পাবে। কারণ `transitionStatus()` প্রথমে DB থেকে আসল status পড়ে, তারপর map চেক করে। ক্লায়েন্ট যা পাঠিয়েছে সেটা বিশ্বাস করা হয় না।

**C4. "Why can't a ticket be resolved without a reply?"**
> প্রোডাক্ট সিদ্ধান্ত। "Resolved" মানে কাস্টমার জানে কী ঠিক হলো। ইন্টারনাল নোট কাস্টমার দেখে না, তাই সেটা গণ্য হয় না — `where: { isInternal: false }`।

**C5. "What does CLOSED mean vs RESOLVED?"**
> RESOLVED = সমাধান পোস্ট হয়েছে, কাস্টমার যাচাই করতে পারে, দরকার হলে ফেরত পাঠানো যায়। CLOSED = চূড়ান্ত, কোনো পরিবর্তন নেই।

**C6. "Why `resolvedAt` nullable and reset?"**
> `RESOLVED`-এ সেট হয়, `CLOSED`-এ আগের মান ধরে রাখে, reopen করলে `null` হয়ে যায়। নাহলে "কবে সমাধান হয়েছিল" ভুল দেখাত।

---

## D. ডেটাবেস ও Prisma

**D1. "Explain your schema."** → পার্ট ৪-এর ছবি + ৫ টেবিল এক এক লাইনে

**D2. "Why a separate ActivityLog table?"** → পার্ট ৪.২ (কথা vs ঘটনা)

**D3. "How do you guarantee the log matches the ticket?"**
> Nested write / `$transaction`। একই transaction-এ দুটোই সফল বা দুটোই ব্যর্থ।

**D4. "What indexes and why?"** → status, assignedToId, dueAt

**D5. "Prisma 7 — what changed?"** ⭐
> Driver adapter বাধ্যতামূলক। `new PrismaClient()` একা চললে runtime-এ throw করে — `new PrismaPg({ connectionString })` লাগে। আর `url` schema থেকে `prisma.config.ts`-এ চলে গেছে।

**D6. "Why a Prisma singleton in `db.ts`?"**
> Dev-এ hot reload প্রতিবার নতুন client বানালে connection pool শেষ হয়ে যায়। `globalThis`-এ cache করে রাখা হয়, শুধু production-এ নয়।

**D7. "N+1 problem আছে?"**
> নেই — `include` আর `_count` দিয়ে এক query-তে সব আসে। তবে `listTickets`-এ `_count.comments` প্রতিটা row-তে subquery করে; খুব বড় ডেটাসেটে সেটা ভারী হতে পারে।

**D8. "Ticket number race?"** → পার্ট ৫ ধাপ ৭ (P2002 retry)

---

## E. Auth ও Security

**E1. "How does auth work?"**
> Email + password → bcrypt hash তুলনা → JWT (HS256, `jose`) sign → `httpOnly` cookie, ৮ ঘণ্টা।

**E2. "Why not NextAuth?"**
> ছোট সারফেস। `auth.ts` এক বসায় পড়া যায়, কোনো hidden behavior নেই। টিমে নতুন কেউ এলে ২ মিনিটে বুঝে ফেলবে। NextAuth-এর সুবিধা (OAuth provider, session table) এখানে দরকার নেই।

**E3. "Cookie flags?"**
> `httpOnly` (JS পড়তে পারে না → XSS-এ token চুরি হয় না), `sameSite: lax` (CSRF রক্ষা), `secure` production-এ (শুধু HTTPS), `maxAge` ৮ ঘণ্টা।

**E4. "JWT-তে পাসওয়ার্ড আছে?"**
> না। শুধু id (sub), name, email, role। Password কখনো token-এ যায় না।

**E5. "Token revoke করা যায়?"**
> না — এটা JWT-র স্বাভাবিক সীমাবদ্ধতা। ৮ ঘণ্টার expiry সেটার ক্ষতি কমায়। আসল সমাধান: short-lived access token + refresh token, বা DB-তে session version।

**E6. "Role enforce করেছ?"** ⭐ সৎ উত্তর
> না। `AGENT`/`ADMIN` আছে কিন্তু শুধু display-এ। এখন যেকোনো signed-in user যেকোনো টিকেট বদলাতে পারে। এটা known limitation, আর প্রথম যে কাজটা করতাম সেটাই।

**E7. "Proxy কেন Prisma ব্যবহার করে না?"**
> Edge runtime-এ Prisma চলে না। তাই সেখানে শুধু `jose` দিয়ে JWT verify — কোনো DB call নেই। এতে প্রতিটা request-এ DB hit বাঁচে।

**E8. "CSRF protection?"**
> `sameSite: lax` + JSON body (form-encoded না)। `lax` cross-site POST-এ cookie পাঠায় না, তাই মূল আক্রমণপথ বন্ধ। তবে double-submit token আরও শক্ত হতো — limitation।

**E9. "SQL injection?"**
> Prisma parameterized query ব্যবহার করে, raw SQL নেই। আর সব ইনপুট Zod দিয়ে validate হয়।

---

## F. AI triage

**F1. "How does the AI part work?"**
> `classifyTicket()` — OpenAI-compatible `/chat/completions`, `temperature: 0`, `response_format: json_object`, ৬ সেকেন্ড timeout। রেসপন্সে `{category, confidence, reason}`।

**F2. "মডেল ডাউন হলে?"** ⭐
> চারটা failure path: env নেই → fallback; `!response.ok` → fallback; JSON parse fail বা অচেনা category → fallback; timeout/exception → fallback। সব ক্ষেত্রেই `confidence: 0` আর **টিকেট তবুও তৈরি হয়**।

**F3. "Why is AI advisory and not automatic?"**
> কারণ ভুল classification কাস্টমারকে ভুল টিমে পাঠায় — সেটা SLA ভাঙার কারণ। মানুষের সিদ্ধান্তই শেষ কথা।

**F4. "How do you know if the AI is any good?"** ⭐⭐
> `aiAccepted` ফিল্ড। টিকেট তৈরির সময় `aiCategory === category.name` তুলনা করে boolean সেভ হয়। মানে accuracy **দাবি** করি না, **মাপা** যায়। এটা না থাকলে "AI ভালো কাজ করে" বলা অসম্ভব প্রমাণ হতো।

**F5. "Fallback-এ confidence 0 কেন?"**
> ইচ্ছাকৃত। মডেল কিছু বলেনি, তাই আত্মবিশ্বাস নেই। UI-তে তখন "Keyword fallback" লেখা দেখায়, "Model · 87% confident" না। মিথ্যা confidence দেখানো সবচেয়ে খারাপ।

**F6. "AI slow হলে?"**
> এখন synchronous — creation block করে। ৬ সেকেন্ড timeout তাই সর্বোচ্চ ৬ সেকেন্ড। Production-এ queue (BullMQ/SQS) দিয়ে async করতাম, টিকেট সাথে সাথে তৈরি হতো, সাজেশন পরে এসে update হতো।

**F7. "Prompt injection?"**
> টিকেটের টেক্সট user-controlled। System prompt স্পষ্ট সীমা দেয় ("Choose exactly one category"), আর আউটপুট Zod-এর মতো চেক করা হয় (`CATEGORY_NAMES.includes`), তাই মডেল যা-ই বলুক পাঁচটার বাইরে গেলে fallback। তবে শক্ত প্রতিরক্ষা নয় — limitation।

---

## G. Next.js 16 ও React

**G1. "Why App Router?"**
> Server Components ডিফল্ট — DB query সরাসরি server-এ, ক্লায়েন্টে JS bundle ছোট। Route handler আর page একই ফোল্ডারে।

**G2. "Server vs Client component কোথায়?"**
> Page/layout সব server (DB পড়ে)। শুধু interactive জিনিস client: `NewTicketDialog`, `StatusControl`, `CommentForm`, `TicketFilters`।

**G3. "Suspense কেন সব জায়গায়?"** ⭐
> `cacheComponents` চালু থাকলে request-time read অবশ্যই Suspense boundary-তে থাকতে হবে। লাভ: shell আগে আসে, প্রতিটা page নিজের সাইজের skeleton দেখায়, তারপর content ভরে।

**G4. "Next 16-এ নতুন কী পেলে?"**
> `middleware.ts` → `proxy.ts` (নাম বদল), `dynamic` route config reject, `cacheComponents`, React Compiler।

**G5. "Route handler-এ `cookies()` ব্যবহার করলে?"**
> Build সময় প্রতিটা GET handler request context ছাড়া probe করা হয়, সেখানে `cookies()` reject করে। তাই `request.headers.get("cookie")` থেকে সরাসরি পড়া হয়েছে — আর handler তার input নিয়ে সৎ থাকে।

**G6. "Server Actions কেন না?"**
> Route handler বেছেছি কারণ HTTP চুক্তিটা স্পষ্ট — curl/Postman দিয়ে টেস্ট করা যায়, status code নিয়ন্ত্রণে থাকে, ভবিষ্যতে mobile client সহজে ব্যবহার করতে পারবে। Server Action-ও ভালো হতো, trade-off।

**G7. "`toErrorResponse` কেন framework error re-throw করে?"** ⭐
> Next `redirect()`, `notFound()` ইত্যাদি implement করে এমন object throw করে যার `digest` `NEXT_` দিয়ে শুরু। catch-all ওগুলো গিলে ফেললে redirect 500 হয়ে যায়। তাই প্রথমেই চেক করে re-throw।

**G8. "Optimistic update করেছ?"**
> না। `router.refresh()` দিয়ে server data আবার আনা হয়। ছোট স্কেলে নির্ভরযোগ্য, তবে 느리게 느껴질 수 있다 — limitation।

---

## H. Testing ও quality

**H1. "কী টেস্ট করেছ?"**
> `calculateDueAt` (৫টা case: normal, mutation, zero-hour, month boundary) আর status machine (২১টা case: legal, illegal, terminal, unknown status) + resolve guard।

**H2. "কেন শুধু এই দুইটা?"** ⭐
> কারণ এই দুইটাই pure function — DB mock লাগে না, দ্রুত চলে। আর এই দুইটা ভাঙলে ব্যবসায়িক ক্ষতি সবচেয়ে বেশি: ভুল SLA মানে ভাঙা প্রতিশ্রুতি, ভুল transition মানে ভাঙা প্রসেস। ৭০% কভারেজের চেয়ে সঠিক জায়গায় ১০০% ভালো।

**H3. "E2E টেস্ট?"**
> নেই। প্রথমে যোগ করতাম Playwright দিয়ে: login → create → illegal transition → 422, resolve without reply → 422।

**H4. "TypeScript strict?"**
> হ্যাঁ। আর Zod দিয়ে runtime validation — TypeScript compile-time, Zod runtime। দুটো আলাদা কাজ করে।

---

## I. Scaling ও scenario

**I1. "১০,০০০ টিকেট/দিন হলে?"**
> ১) cursor pagination (এখন ১০০-এ capped), ২) AI queue-তে, ৩) dashboard count cache/Redis, ৪) `status + dueAt` composite index, ৫) read replica রিপোর্টের জন্য।

**I2. "দুই agent একসাথে একই টিকেট বদলালে?"**
> এখন last-write-wins। সমাধান: optimistic concurrency — `updatedAt` বা version column, mismatch হলে 409।

**I3. "DB ডাউন হলে?"**
> এখন 500 + log। ভালো উত্তর: health check, circuit breaker, graceful error message, retry with backoff।

**I4. "Multi-tenant করতে হলে?"**
> `Organization` মডেল + প্রতিটা query-তে `organizationId` filter, বা Postgres RLS। এটা বড় পরিবর্তন — এখন নেই।

**I5. "Real-time notification?"**
> SSE বা WebSocket। বা polling `router.refresh()`। এখন manual refresh।

---

## J. Behavioural / HR

**J1. "নিজের সম্পর্কে বলো।"** → ৬০–৯০ সেকেন্ড। নাম → কী করো → এই প্রজেক্ট → কেন এই role।

**J2. "কেন NT Tech Innovation?"** → সৎ হও। "রাজশাহীতে-based টিম, আমি সেখানে থাকতে রাজি, আর আপনার assignment-টা interesting ছিল — বিশেষ করে state machine অংশটা।"

**J3. "Relocate করতে পারবে?"** → স্পষ্ট "হ্যাঁ"। জিজ্ঞেস করো: "relocation support আছে?"

**J4. "দুর্বলতা?"** → সৎ + সমাধানসহ। "বড় codebase-এ কাজ কম করেছি, বেশিরভাগ solo project। তাই code review-এর অভ্যাস তৈরি করতে চাই।"

**J5. "৫ বছর পরে কোথায়?"** → senior full-stack, সিস্টেম design-এ শক্ত।

**J6. "Salary expectation?"** → range বলো, এক সংখ্যা না। "আপনাদের range জানলে ভালো হয়" — আগে ওদের জিজ্ঞেস করো।

---

## K. Live coding আসতে পারে

| সম্ভাব্য | প্রস্তুতি |
| --- | --- |
| FizzBuzz / array manipulation | basic ঠিক রাখো |
| "এই function-টা লিখো" (e.g. `calculateDueAt`) | তোমার নিজের কোডই আসতে পারে |
| "এই কোডে bug খোঁজো" | race condition, missing await, error swallow |
| SQL query লেখো | `GROUP BY status`, `WHERE dueAt < now()` |
| React component | controlled input + fetch + error state |

**সোনার নিয়ম:** জোরে ভাবো। "প্রথমে আমি ইনপুট validate করব, তারপর..." — চুপ করে বসে থাকলে interviewer কিছুই জানে না।

---

# পার্ট ৮ — শেষ ৩০ মিনিটের রিভিশন

Interview-এর আগে গাড়িতে/হোটেলে শুধু এই ১০টা লাইন:

1. **SLA = সময়ের প্রতিশ্রুতি। `dueAt = createdAt + defaultSlaHours`। সার্ভারের ঘড়িতে।**
2. **Breach = `dueAt < now` আর status RESOLVED/CLOSED না।**
3. **Billing 4h · Technical 12h · Account 24h · Other 48h · Feature 72h**
4. **State machine: OPEN → IN_PROGRESS → RESOLVED → CLOSED। CLOSED terminal। বেআইনি move = 422।**
5. **Resolve guard: public reply ছাড়া resolve না। Internal note গণ্য হয় না।**
6. **AI advisory: ৬s timeout, ৪টা fallback, `aiAccepted` দিয়ে accuracy মাপা।**
7. **Assignment: যার কম খোলা টিকেট।**
8. **Number race: count → `TKT-0001` → P2002 → ৩ বার retry।**
9. **Activity log: একই transaction-এ।**
10. **Limitation: calendar hours (business hours না), pagination নেই, role enforce নেই, AI synchronous।**

**শেষ কথা:** তুমি এই কোড লিখেছ। ৪ দিন আগের তুমি এটা পুরোপুরি জানতে। এখন শুধু মনে করিয়ে দিতে হবে। ঘাবড়ানোর কিছু নেই — ওরা তোমাকে ডেকেছে কারণ ওরা তোমার কাজ পছন্দ করেছে। 🙂

শুভকামনা!
