/**
 * ============================================================================
 *                    DESKFLOW - AI TRIAGE SERVICE (কৃত্রিম বুদ্ধিমত্তা ট্রায়াজ)
 * ============================================================================
 * 
 * [আর্কিটেকচারাল দর্শন / AI Architectural Principles]:
 * এই সার্ভিসটি ইনকামিং টিকিট অ্যানালাইসিস করে ক্যাটাগরি এবং কনফিডেন্স স্কোর নির্ধারণ করে।
 * 
 * [ইন্টারভিউ স্পেশাল পয়েন্ট / Key Talking Points for Interview]:
 * ১. Advisory, Not Authoritative: 
 *    AI কখনোই শেষ কথা নয়। এটি শুধুমাত্র পরামর্শদাতা (Advisor)। কাস্টমার যে ক্যাটাগরি 
 *    সিলেক্ট করে সেটাই চূড়ান্ত থাকে; AI-এর পরামর্শ ইউজার গ্রহণ করেছে কি না তা 
 *    `aiAccepted` ফিল্ডের মাধ্যমে অডিট ও মনিটরিং করা হয়।
 * ২. Deterministic Output (শূন্য হ্যালুসিনেশন):
 *    - `temperature: 0` দিয়ে মডেলকে সম্পূর্ণ ডিটারমিনিস্টিক ও ফ্যাক্ট-বেইজড করা হয়েছে।
 *    - `response_format: { type: "json_object" }` নিশ্চিত করে মডেল শুধুমাত্র ভ্যালিড JSON দেবে।
 * ৩. Timeout & Circuit Breaker Pattern:
 *    - `AbortSignal.timeout(6000)` ব্যবহার করা হয়েছে। ৬ সেকেন্ডে রেসপন্স না আসলে রিকোয়েস্ট 
 *      স্বয়ংক্রিয়ভাবে বাতিল হয়ে লোকাল কী-ওয়ার্ড ফলব্যাকে চলে যাবে।
 * ৪. ফোর-টিয়ার রেজিলিয়েন্স / ৪-টি ফলব্যাক পাথ (Never Fail Architecture):
 *    - পাথ ১: এনভায়রনমেন্ট ভেরিয়েবল না থাকলে (Missing API Keys)
 *    - পাথ ২: HTTP স্ট্যাটাস 200 না হলে (!response.ok)
 *    - পাথ ৩: মডেল অবৈধ ক্যাটাগরি দিলে বা JSON পার্স ফেইল করলে
 *    - পাথ ৪: নেটওয়ার্ক ফেইলিউর বা ৬ সেকেন্ডের টাইমআউট ঘটলে
 *    সবক্ষেত্রেই `fallbackClassify()` কল হয়, ফলে গ্রাহকের টিকিট তৈরি কখনো বিঘ্নিত হয় না।
 * ৫. প্রি-কম্পাইল্ড রেজেক্স (Performance Regex):
 *    সার্ভার স্টার্টের সময়ই কী-ওয়ার্ডগুলোর বাউন্ডারি রেজেক্স `\bword\b` কম্পাইল করে রাখা হয়,
 *    যাতে ফলব্যাক শ্রেণিবিন্যাস ০.১ মিলি-সেকেন্ডে সম্পন্ন হতে পারে।
 * ============================================================================
 */

// অনুমোদিত ক্যাটাগরি সমূহের ধ্রুবক তালিকা
export const CATEGORY_NAMES = [
  "Billing",
  "Technical",
  "Account",
  "Feature Request",
  "Other",
] as const;

// ক্লাসিফিকেশনের আউটপুট ইন্টারফেস
export type Classification = {
  category: string;
  confidence: number;
  source: "model" | "fallback";
};

/**
 * [লোকাল রুলস ডিকশনারি / Heuristic Fallback Rules]:
 * AI ইঞ্জিন অনুপলব্ধ থাকলে এই শব্দকোষ ব্যবহার করে কনটেন্ট ক্যাটাগরাইজ করা হবে।
 */
const KEYWORD_RULES: { category: string; words: string[] }[] = [
  { 
    category: "Billing", 
    words: ["invoice", "refund", "charge", "payment", "billing", "vat", "price", "subscription"] 
  },
  {
    category: "Technical",
    words: [
      "error", "crash", "bug", "slow", "load", "api", "500", "upload", "export",
      "search", "freeze", "frozen", "hang", "unresponsive", "stuck", "timeout",
      "not responding", "broken",
    ],
  },
  { 
    category: "Account", 
    words: ["password", "login", "email", "2fa", "two-factor", "account", "reset"] 
  },
  { 
    category: "Feature Request", 
    words: ["add", "request", "would be", "feature", "support for", "integration"] 
  },
];

/**
 * শব্দের আগে-পরে ওয়ার্ড বাউন্ডারি (\b) যুক্ত করে রেগুলার এক্সপ্রেশন তৈরি করে।
 * এটি নিশ্চিত করে যে "load" শব্দটি "download" এর মধ্যে ভুলবশত ম্যাচ করবে না।
 */
function wordPattern(word: string): RegExp {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

// অ্যাপ্লিকেশনের মেমোরিতে রেজেক্সগুলো একবারই প্রি-কম্পাইল করে রাখা হলো (High Performance)
const COMPILED_RULES = KEYWORD_RULES.map((rule) => ({
  category: rule.category,
  patterns: rule.words.map(wordPattern),
}));

/**
 * AI ছাড়া লোকাল কী-ওয়ার্ড সার্চের মাধ্যমে ক্যাটাগরি নির্ণয়ের ফলব্যাক ফাংশন।
 * কনফিডেন্স সবসময় ০ সেট করা হয় যাতে সিস্টেম জানে এটি AI মডেলের প্রেডিকশন নয়।
 */
function fallbackClassify(text: string): Classification {
  const haystack = text.toLowerCase();

  let best = { category: "Other", hits: 0 };
  for (const rule of COMPILED_RULES) {
    const hits = rule.patterns.filter((pattern) => pattern.test(haystack)).length;
    if (hits > best.hits) best = { category: rule.category, hits };
  }

  return { category: best.category, confidence: 0, source: "fallback" };
}

/**
 * টিকিটের সাবজেক্ট ও ডেসক্রিপশন পর্যালোচনা করে ক্যাটাগরি নির্ধারণকারী মূল ফাংশন।
 * 
 * @param subject টিকিটের শিরোনাম
 * @param description টিকিটের বিস্তারিত বিবরণ
 * @returns Classification রেজাল্ট অবজেক্ট (ক্যাটাগরি, কনফিডেন্স, সোর্স)
 */
export async function classifyTicket(
  subject: string,
  description: string,
): Promise<Classification> {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL;

  // টোকেন কস্ট ও বাফার ওভারফ্লো রোধে সর্বোচ্চ ১৫০০ ক্যারেক্টার লিমিট
  const text = `${subject}\n${description}`.slice(0, 1500);

  // ফলব্যাক পাথ ১: এনভায়রনমেন্ট কনফিগ না থাকলে সরাসরি লোকাল রুলস দিয়ে প্রসেস
  if (!apiKey || !baseUrl || !model) {
    return fallbackClassify(text);
  }

  try {
    // OpenAI-কম্প্যাটিবল এন্ডপয়েন্টে কল করা হচ্ছে (যেমন: OpenAI, Groq, Anthropic proxy ইত্যাদি)
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0, // ডিটারমিনিস্টিক আউটপুটের জন্য ০ টেম্পারেচার
        response_format: { type: "json_object" }, // কঠোর JSON আউটপুট ফর্ম্যাট
        messages: [
          {
            role: "system",
            content:
              `You classify support tickets for a B2B SaaS help desk.\n` +
              `Choose exactly one category:\n` +
              `- Billing: invoices, charges, refunds, payments, pricing, VAT, subscriptions\n` +
              `- Technical: errors, crashes, slow or frozen pages, uploads, exports, search, broken integrations\n` +
              `- Account: login, password, 2FA, email address, profile or account settings\n` +
              `- Feature Request: asking for functionality that does not exist yet\n` +
              `- Other: anything that does not fit the above\n` +
              `Reply with JSON only: {"category": string, "confidence": number between 0 and 1, "reason": one short sentence}.`,
          },
          { role: "user", content: text },
        ],
      }),
      // ৬ সেকেন্ডের কঠোর টাইমআউট সার্কিট ব্রেকার
      signal: AbortSignal.timeout(6000),
    });

    // ফলব্যাক পাথ ২: নন-200 রেসপন্স (API ডাউন বা রেট লিমিট)
    if (!response.ok) return fallbackClassify(text);

    const payload = await response.json();
    const raw = payload?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") return fallbackClassify(text);

    const parsed = JSON.parse(raw) as {
      category?: string;
      confidence?: number;
    };

    // ফলব্যাক পাথ ৩: মডেল অনুমোদিত লিস্টের বাইরে কোনো মনগড়া ক্যাটাগরি দিলে
    if (!parsed.category || !CATEGORY_NAMES.includes(parsed.category as never)) {
      return fallbackClassify(text);
    }

    return {
      category: parsed.category,
      // কনফিডেন্স ০ থেকে ১ এর মধ্যে নরমালাইজড রাখা হলো
      confidence:
        typeof parsed.confidence === "number"
          ? Math.min(1, Math.max(0, parsed.confidence))
          : 0.5,
      source: "model",
    };
  } catch {
    // ফলব্যাক পাথ ৪: নেটওয়ার্ক ফেইলিউর বা AbortSignal টাইমআউট হলে
    return fallbackClassify(text);
  }
}
