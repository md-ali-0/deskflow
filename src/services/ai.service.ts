export const CATEGORY_NAMES = [
  "Billing",
  "Technical",
  "Account",
  "Feature Request",
  "Other",
] as const;

export type Classification = {
  category: string;
  confidence: number;
  source: "model" | "fallback";
};

const KEYWORD_RULES: { category: string; words: string[] }[] = [
  { category: "Billing", words: ["invoice", "refund", "charge", "payment", "billing", "vat", "price", "subscription"] },
  {
    category: "Technical",
    words: [
      "error", "crash", "bug", "slow", "load", "api", "500", "upload", "export",
      "search", "freeze", "frozen", "hang", "unresponsive", "stuck", "timeout",
      "not responding", "broken",
    ],
  },
  { category: "Account", words: ["password", "login", "email", "2fa", "two-factor", "account", "reset"] },
  { category: "Feature Request", words: ["add", "request", "would be", "feature", "support for", "integration"] },
];

function fallbackClassify(text: string): Classification {
  const haystack = text.toLowerCase();

  let best = { category: "Other", hits: 0 };
  for (const rule of KEYWORD_RULES) {
    const hits = rule.words.filter((w) => haystack.includes(w)).length;
    if (hits > best.hits) best = { category: rule.category, hits };
  }

  return { category: best.category, confidence: 0, source: "fallback" };
}

export async function classifyTicket(
  subject: string,
  description: string,
): Promise<Classification> {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL;

  const text = `${subject}\n${description}`.slice(0, 1500);

  if (!apiKey || !baseUrl || !model) {
    return fallbackClassify(text);
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `You classify support tickets. Reply with JSON only: ` +
              `{"category": one of ${JSON.stringify(CATEGORY_NAMES)}, ` +
              `"confidence": number between 0 and 1, ` +
              `"reason": one short sentence}.`,
          },
          { role: "user", content: text },
        ],
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) return fallbackClassify(text);

    const payload = await response.json();
    const raw = payload?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") return fallbackClassify(text);

    const parsed = JSON.parse(raw) as {
      category?: string;
      confidence?: number;
    };

    if (!parsed.category || !CATEGORY_NAMES.includes(parsed.category as never)) {
      return fallbackClassify(text);
    }

    return {
      category: parsed.category,
      confidence:
        typeof parsed.confidence === "number"
          ? Math.min(1, Math.max(0, parsed.confidence))
          : 0.5,
      source: "model",
    };
  } catch {
    return fallbackClassify(text);
  }
}
