# NT Tech Innovation — On-Site Interview Prep

**Position:** Full Stack Developer  
**Date:** 2 November 2026 (Monday), 4:00 PM  
**Venue:** NT Tech Innovation, Bangladesh Hi-Tech Park, Silicon Tower, Level 7D, Rajshahi  
**Assignment:** DeskFlow — support desk with SLA, status machine, AI triage

---

## 1. সিদ্ধান্ত: যাও

কারণগুলো পরিষ্কার:

- এখন কোনো চাকরি নেই — একটা on-site interview একটা খরচ, কিন্তু একটা বন্ধ দরজা স্থায়ী।
- ওরা আপনার **কোড পড়েই** ডেকেছে। মানে assignment পাশ করেছে। এটা অনেক দূর এগিয়ে যাওয়া।
- On-site মানে ওরা সিরিয়াস। অনেক কোম্পানি এখনো remote-এ ভুয়া "interview" করে; এরা স্পষ্ট বলেছে online সম্ভব না।
- Rajshahi Hi-Tech Park সরকারি park, campus-টা নিরাপদ ও পরিচিত জায়গা।
- "না" বললে কিছুই হারাবে না, কিন্তু "হ্যাঁ" বললে হয় চাকরি, নাহয় interview experience + feedback।

একটাই শর্ত: **টাকা লাগবে না**। কোনো "training fee", "registration fee", "security deposit" চাইলে সাথে সাথে বেরিয়ে আসবে।

---

## 2. ট্রাভেল প্ল্যান (ঢাকা → রাজশাহী)

Interview সোমবার **বিকেল ৪টা**। মানে সোমবার সকালে রওনা দিলে ঝুঁকি আছে — বাস ১ ঘণ্টা দেরি হলে interview মিস।

**সুপারিশ: রবিবার (১ নভেম্বর) রওনা দিয়ে রাজশাহীতে রাত কাটাও, সোমবার দুপুরে ফ্রেশ হয়ে যাও।**

| অপশন                     | সময়          | ভাড়া (approx) | নোট                                                           |
| ------------------------ | ------------- | -------------- | ------------------------------------------------------------- |
| AC বাস (পদ্মা সেতু হয়ে) | ৪.৫–৫.৫ ঘণ্টা | ৮০০–১২০০৳      | গাবতলী / কল্যাণপুর / সায়েদাবাদ থেকে। সবচেয়ে সহজ             |
| নন-AC বাস                | ৫–৬ ঘণ্টা     | ৫০০–৭০০৳       | সস্তা, ক্লান্তি বেশি                                          |
| ট্রেন (কমলাপুর)          | ৫–৬ ঘণ্টা     | ৫০০–১১০০৳      | সিল্ক সিটি / বনলতা / পদ্মা এক্সপ্রেস। **আগে টিকিট কাটো**      |
| ফ্লাইট (শাহ মখদুম)       | ~১ ঘণ্টা      | ৪০০০–৬০০০৳     | সময় বাঁচে, খরচ বেশি। সকালের ফ্লাইট নিলে সোমবারেই যাওয়া যায় |

> ট্রেনের সময়/ভাড়া বদলায় — bdtrain.net বা railway.gov.bd-এ যাওয়ার আগের দিন মিলিয়ে নিও।

**সময়রেখা (সোমবার):**

- ১১:০০ — উঠে নাশতা, ডেমো একবার চালিয়ে দেখো
- ১৩:৩০ — হোটেল চেকআউট (ব্যাগ ক্লোকরুমে রেখে দিতে পারো)
- ১৫:১৫ — অফিসে পৌঁছে যাও (৩০–৪৫ মিনিট আগে)
- ১৬:০০ — interview

**হোটেল:** রাজশাহী শহরে (Sahebbazar / Shaheb Bazar / Upashahar এলাকা) ৮০০–২০০০৳-এ ভালো থাকার জায়গা পাওয়া যায়। Hi-Tech Park থেকে ১৫–২৫ মিনিট। আগে বুক করে রাখো।

**বাজেট মোট (round trip + ১ রাত):** ৩৫০০–৬০০০৳। এটাকে investment ভাবো, খরচ না।

---

## 3. ব্যাগে কী থাকবে

**অবশ্যই:**

- [ ] ল্যাপটপ + চার্জার + মাউস
- [ ] ফোনের হটস্পট (আলাদা সিম/প্যাকেজ) + পাওয়ার ব্যাংক
- [ ] **লোকাল `.env` সেট করা ভার্সন** — Vercel ডাউন থাকলে বা নেট না পেলে লোকালেই ডেমো
- [ ] লোকাল Postgres চালু আছে কিনা আগে টেস্ট করে যাও (`pnpm prisma migrate deploy && pnpm prisma db seed`)
- [ ] প্রিন্ট করা **১ পেজের architecture diagram + ER diagram** (হাতে ধরিয়ে দিতে পারবে)
- [ ] CV ২ কপি
- [ ] NID / সার্টিফিকেটের কপি, পাসপোর্ট সাইজ ছবি ২ কপি
- [ ] নোটপ্যাড + কলম

**স্মার্ট মুভ:** ডেমোর স্ক্রিনশট/GIF কয়েকটা ফোনে রেখে যাও। ইন্টারনেট বা DB যাই হোক, অন্তত দেখাতে পারবে।

---

## 4. প্রেজেন্টেশন স্ক্রিপ্ট (৬–৮ মিনিট)

ওরা বলেছে "explain and present the task"। মানে কোড লাইন ধরে ধরে পড়া না — **সিদ্ধান্তগুলো** বলা। এই ৫ ধাপে যাও:

### ধাপ ১ — সমস্যা (৪৫ সেকেন্ড)

> "A support desk for small teams. Three things make it interesting: every ticket has an SLA deadline, the status workflow can't be bypassed, and an AI suggests a category the moment a ticket arrives. My goal was not to build a pretty CRUD app — it was to make the rules live on the server, not in the UI."

### ধাপ ২ — ডেমো (২.৫ মিনিট)

এই ক্রমে দেখাও, প্রতিটা ২০–৩০ সেকেন্ড:

1. **Login** (`admin@deskflow.dev` / `Admin@2026`) — এক ক্লিকে ফর্ম ফিল হয়
2. **Dashboard** — status counts + SLA breach count
3. **Ticket list** — overdue গুলো লাল, deadline অনুযায়ী sort
4. **New ticket তৈরি** — AI suggestion + confidence দেখাও
5. **Ticket detail** — reply, internal note, activity log
6. **Status change** — `OPEN → RESOLVED` সরাসরি করতে গেলে **422 error** দেখাও ⭐
7. **Resolve guard** — public reply ছাড়া resolve করতে গেলে error ⭐

> ৬ আর ৭ নম্বরই তোমার সবচেয়ে শক্ত ডেমো। এখানে দেখাচ্ছে নিয়মটা UI-তে লুকানো না, **API-তে enforce** করা।

### ধাপ ৩ — Architecture (১.৫ মিনিট)

```
Browser
  │
  ├── proxy.ts            ← Edge: শুধু JWT verify (Prisma/bcrypt নেই)
  │
  ├── app/(app)/*         ← Server Components, Suspense দিয়ে stream
  │
  └── app/api/*/route.ts  ← thin handler: auth → Zod → service → JSON
            │
            ▼
      services/
        ticket.service.ts   status machine, numbering, assignment
        sla.service.ts      dueAt calculation
        ai.service.ts       triage + keyword fallback
            │
            ▼
      Prisma 7 + @prisma/adapter-pg  →  PostgreSQL
```

বলার মতো এক লাইন: *"Route handlers-এ কোনো business logic নেই। ওরা শুধু auth করে, Zod দিয়ে validate করে, service-এ পাঠায়। এতে নিয়মগুলো এক জায়গায় থাকে আর pure function হিসেবে টেস্ট করা যায়।"*

### ধাপ ৪ — তিনটা কঠিন সিদ্ধান্ত (২ মিনিট) ⭐⭐

**১. Status machine সার্ভারে, UI-তে না**

`src/lib/ticket-rules.ts` — একটা map, pure function:

```
OPEN → IN_PROGRESS, CLOSED
IN_PROGRESS → RESOLVED, OPEN
RESOLVED → CLOSED, IN_PROGRESS
CLOSED → (কিছু না)
```

`transitionStatus()` প্রথমে DB থেকে আসল status পড়ে, তারপর নিয়ম চেক করে, তারপর 422 ছোড়ে। UI-তে বাটন লুকানো শুধু UX — **আসল গার্ড API-তে**। কারণ UI bypass করা যায় (curl, devtools)।

**২. AI advisory, blocking না**

`classifyTicket()` — ৬ সেকেন্ড timeout, `response_format: json_object`, আর **চারটা failure path** আছে:

- env নেই → keyword fallback
- `!response.ok` → fallback
- JSON parse fail / category অচেনা → fallback
- exception / timeout → fallback

Fallback-এ `confidence: 0`, আর ticket তবুও তৈরি হয়। **AI ডাউন থাকলে সিস্টেম ডাউন না।** আর `aiAccepted` ফিল্ডে মানুষ যে category বেছেছে বনাম AI যা বলেছে সেটা সেভ হয় — তাই accuracy **দাবি** না, **মাপা**।

**৩. Ticket number-এর race condition**

`TKT-0001` আসে row count থেকে। দুইটা request একসাথে এলে একই নম্বর আসতে পারে → unique index `P2002` দেয় → কোড নতুন count নিয়ে **৩ বার পর্যন্ত retry** করে।

> এই তিনটা বললে ওরা বুঝবে তুমি শুধু কোড লিখনি, **কী ভাঙতে পারে** সেটাও ভেবেছ।

বোনাস (জিজ্ঞেস করলে বলো):

- Activity log ticket-এর সাথে **একই transaction-এ** লেখা হয় (`$transaction` / nested write) — তাই audit trail কখনো ticket-এর সাথে মিথ্যা বলবে না।
- `toErrorResponse()` framework signal (`digest` `NEXT_` দিয়ে শুরু) re-throw করে — নাহলে `redirect()` 500 হয়ে যেত।
- Next 16-এ middleware-এর নাম `proxy`, আর ওটা Edge-এ চলে তাই সেখানে Prisma/bcrypt রাখা যায় না।

### ধাপ ৫ — সীমাবদ্ধতা ও পরের ধাপ (১ মিনিট)

**নিজে থেকে বলো — এটা শক্তি, দুর্বলতা না:**

- Pagination নেই, list ১০০ row-এ capped — ডেমোতে ঠিক, আসল queue-তে না
- Role (`AGENT`/`ADMIN`) শুধু display-এ; এখন সবাই সব ticket বদলাতে পারে
- AI triage synchronous — model ধীর হলে creation ধীর। Production-এ queue লাগবে
- Email notification, attachment, multi-tenant নেই
- E2E টেস্ট নেই, শুধু pure function-এর unit test

**"আরও এক সপ্তাহ পেলে কী করতে?"** — উত্তর রেডি রাখো: RBAC enforce → pagination + cursor → triage queue-তে সরানো → Playwright দিয়ে status machine-এর E2E।

---

## 5. যেসব প্রশ্ন আসতে পারে

| প্রশ্ন                           | উত্তরের কাঠামো                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Why not NextAuth?                | হাতে লেখা session `src/lib/auth.ts`-এ এক বসায় পড়া যায়। JWT-তে id/name/email/role আছে, তাই বেশিরভাগ request user table ছোঁয় না। ছোট সারফেস = কম bug  |
| Cookie-তে JWT কেন?               | `httpOnly` (XSS-এ JS পড়তে পারে না), `sameSite: lax` (CSRF), production-এ `secure`, ৮ ঘণ্টা expiry                                                      |
| DB ডাউন হলে?                     | এখন 500 + log। ভালো উত্তর: health check + circuit breaker + user-friendly retry message                                                                 |
| ১০ হাজার ticket/দিন হলে?         | Cursor pagination, `status`/`dueAt`-এ index (আছে), AI queue-তে, dashboard count Redis-এ, read replica                                                   |
| SLA কীভাবে?                      | `dueAt` creation-এর সময় **server clock** থেকে stamp হয়, category-র `defaultSlaHours` (Billing 4h, Technical 12h, Account 24h, Feature 72h, Other 48h) |
| টেস্ট কী টেস্ট করেছ?             | SLA calculation + status machine + resolve guard — pure function, DB লাগে না। কেন: এই দুইটা ভাঙলে ব্যবসায়িক ক্ষতি সবচেয়ে বেশি                         |
| Server Actions কেন না?           | Route handler বেছেছি কারণ API চুক্তিটা স্পষ্ট আর curl/Postman দিয়ে টেস্ট করা যায়। ভুল উত্তর না — trade-off বলো                                        |
| Security-তে কী ছাড়?             | Role enforcement নেই (সৎভাবে স্বীকার করো), rate limiting নেই, CSRF শুধু sameSite-এ নির্ভর                                                               |
| Prisma 7-এ কী আলাদা?             | Driver adapter বাধ্যতামূলক — `new PrismaClient()` একা চলবে না, `new PrismaPg({ connectionString })` লাগে। `url` schema থেকে `prisma.config.ts`-এ গেছে   |
| Numbering কেন auto-increment না? | User-facing `TKT-0001` চেয়েছিলাম; DB sequence হলে delete-এ গ্যাপ পড়ে। Trade-off: race → P2002 → retry                                                 |
| কোন অংশটা সবচেয়ে কঠিন ছিল?      | সৎ উত্তর দাও। সম্ভবত `cacheComponents` + Suspense — build সময় GET handler-এ `cookies()` reject করে, তাই request header থেকে cookie পড়তে হয়েছে        |

**যে প্রশ্নের উত্তর জানো না:** "এটা আমি এখনো করিনি — আমার ধারণা এরকম হবে, কিন্তু নিশ্চিত না।" এটাই সবচেয়ে ভালো উত্তর। বানিয়ে বলা সবচেয়ে খারাপ।

---

## 6. লাইভ ডেমো ফেইল করলে

| সমস্যা            | প্ল্যান বি                                            |
| ----------------- | ----------------------------------------------------- |
| ইন্টারনেট নেই     | ফোনের হটস্পট, তারপরও না হলে লোকাল `pnpm dev`          |
| Vercel/DB ডাউন    | লোকাল Postgres — **আগের রাতে টেস্ট করে যাও**          |
| কিছুই চলছে না     | ফোনে রাখা স্ক্রিনশট/GIF দিয়ে হাঁটাও, কোড দেখিয়ে বলো |
| ল্যাপটপ চার্জ শেষ | চার্জার + পাওয়ার ব্যাংক; কোড GitHub-এ ওপেন রাখো ফোনে |

**সোনার নিয়ম:** ডেমো ফেইল করলে ক্ষমা চেয়ে থেমে যেও না। বলো *"no problem, let me show you the code that does this"* — এবং এডিটরে সেই ফাইলটা খুলে দেখাও। এটা প্রায়ই ডেমোর চেয়ে বেশি ইমপ্রেস করে।

---

## 7. ওদের যা জিজ্ঞাসা করবে

Interview-এর শেষে প্রশ্ন করাটা "আগ্রহী" সিগন্যাল। ৩–৪টা বেছে নাও:

1. এই role-এ প্রথম ৩ মাসে সফলতা কেমন দেখতে?
2. টিমে কতজন, কে code review করে?
3. Stack কি এটাই থাকবে, নাকি ভিন্ন কিছু চলছে?
4. Deployment, on-call, sprint cadence কেমন?
5. **Rajshahi office-এ relocate করতে হবে, নাকি hybrid সম্ভব?** ← সরাসরি জিজ্ঞেস করো
6. এই পদে salary range কত? (HR round-এ করাই ভালো, কিন্তু এড়িয়ে যেয়ো না)

---

## 8. সতর্কতা

- ❌ কোনো টাকা, training fee, "offer confirmation fee" — কখনো না
- ✅ Offer চাই **লিখিত** (email/PDF), মৌখিক আশ্বাসে resign/commit না
- ✅ Salary, joining date, relocation support — লিখিতভাবে কনফার্ম করো
- ✅ অফিসের ঠিকানা ওয়েবসাইট/LinkedIn-এ ক্রসচেক করো
- ⚠️ চুক্তি সই করার আগে পড়ো — bond/notice period clause দেখো

---

## 9. Email রিপ্লাই (এখনই পাঠাও)

Subject: `Interview Confirmation — Full Stack Developer — 2 November 2026`

```
Dear HR Team,

Thank you for the invitation. I am confirming that I will attend the on-site
interview for the Full Stack Developer position on Monday, 2 November 2026
at 4:00 PM at your Rajshahi office.

I have reviewed my submitted DeskFlow assignment and will come prepared to
walk through the architecture, the key design decisions, and the trade-offs
I made — including the SLA calculation, the server-side status machine, the
resolve guard, and the AI triage fallback.

Please let me know if there is anything specific you would like me to
demonstrate or bring along.

Looking forward to meeting the team.

Best regards,
Md. Ali
[phone] | [email]
[GitHub] | [Live demo]
```


```

---

## 10. ৭২ ঘণ্টার চেকলিস্ট

**আজ, ২৯ অক্টোবর (বৃহস্পতিবার)**
- [ ] উপরের email রিপ্লাই পাঠাও ← সবচেয়ে জরুরি
- [ ] ট্রেন/বাস টিকিট বুক করো (১ নভেম্বর)
- [ ] হোটেল বুক করো (১ রাত)
- [ ] GitHub repo public কিনা + README ঠিক আছে কিনা দেখো
- [ ] Live demo এখনো চলছে কিনা টেস্ট করো

**৩০ অক্টোবর (শুক্রবার)**
- [ ] পুরো ডেমো একবার নিজে চালাও, ৬ মিনিটে
- [ ] লোকাল `.env` + DB সেট করে `pnpm dev` চালাও
- [ ] `pnpm test` চালাও — পাশ করছে কিনা দেখো

**৩১ অক্টোবর (শনিবার)**
- [ ] প্রেজেন্টেশন ২ বার জোরে জোরে প্র্যাকটিস (টাইমার দিয়ে)
- [ ] Architecture + ER diagram প্রিন্ট করো
- [ ] CV প্রিন্ট, কাগজপত্র গুছাও

**১ নভেম্বর (রবিবার)**
- [ ] রাজশাহী রওনা, হোটেলে চেক-ইন
- [ ] রাতে ডেমো আরেকবার, ব্যাগ গোছাও

**২ নভেম্বর (সোমবার)**
- [ ] ১১টায় উঠে নাশতা + ডেমো টেস্ট
- [ ] ১৫:১৫-তে অফিসে
- [ ] ১৬:০০ interview 🚀
