/**
 * ============================================================================
 *               DESKFLOW - AUTHENTICATION & SESSION MANAGEMENT
 * ============================================================================
 * 
 * [আর্কিটেকচারাল সারসংক্ষেপ / Architecture Overview]:
 * এই মডিউলটি সম্পূর্ণ স্টেটলেস JWT সেশন, ক্রিপ্টোগ্রাফিক ভ্যালিডেশন, 
 * সিকিউর কুকি পলিসি এবং ইউনিফাইড এরর রেসপন্স হ্যান্ডলিং পরিচালনা করে।
 * 
 * [ইন্টারভিউ স্পেশাল পয়েন্ট / Key Talking Points for Interview]:
 * ১. Stateless JWT vs Server Session Store:
 *    - সার্ভারে কোনো Redis বা সেশন ডাটাবেজ টেবিল মেইনটেইন করার প্রয়োজন হয় না। 
 *      টোকেন নিজেই ক্রিপ্টোগ্রাফিক্যালি সেল্ফ-কনটেইন্ড (Self-contained) এবং ট্যাম্পার-প্রুফ।
 * ২. আয়রনক্ল্যাড কুকি সিকিউরিটি (Ironclad Security Attributes):
 *    - `httpOnly: true` -> ব্রাউজারের কোনো জাভাস্ক্রিপ্ট কোড (এমনকি XSS অ্যাটাক হলেও) 
 *      `document.cookie` দিয়ে সেশন টোকেন রিড করতে পারে না।
 *    - `sameSite: "lax"` -> ক্ষতিকর থার্ড-পার্টি সাইট থেকে CSRF (Cross-Site Request Forgery) 
 *      রিকোয়েস্ট স্বয়ংক্রিয়ভাবে ফিল্টার করে দেয়।
 *    - `secure: true` (Production) -> টোকেন কখনোই আন-এনক্রিপ্টেড প্লেইন HTTP-তে সেন্ড হয় না।
 * ৩. কাস্টম কুকি পার্সার (`readCookie`):
 *    - Next.js-এর `cookies()` মেথড রাউট হ্যান্ডলারে কখনো কখনো আন-অপ্টিমাইজড ডাইনামিক 
 *      রেন্ডারিং ট্রিগার করে। রিকোয়েস্ট হেডার থেকে সরাসরি কুকি পার্সিং জিরো-ওভারহেড দেয়।
 * ৪. নেক্সট.জেএস ফ্রেমওয়ার্ক সিগন্যাল প্রিজারভেশন (`isFrameworkSignal`):
 *    - Next.js তার ইন্টারনাল রিডাইরেক্ট (`redirect()`) বা 404 (`notFound()`) পরিচালনা করার 
 *      জন্য ইন্টারনাল Error থ্রো করে (যার `digest` ফিল্ড শুরু হয় `NEXT_` দিয়ে)।
 *    - গ্লোবাল এরর হ্যান্ডলারে এই সিগন্যাল রি-থ্রো (`throw error`) না করলে নেক্সট.জেএসের 
 *      স্বাভাবিক রিডাইরেক্ট কাজ না করে ভুলবশত 500 সার্ভার এরর রিটার্ন করবে!
 * ============================================================================
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";

// অনুমোদিত ইউজার রোল টাইপ
export type Role = "AGENT" | "ADMIN";

// সেশনের ভেতরে সংরক্ষিত ইউজারের মূল প্রোফাইল
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

/**
 * কাস্টম HTTP এরর ক্লাস।
 * সার্ভিস লেয়ারে কোনো Next.js রেসপন্স অবজেক্ট পাস না করেই এইচটিটিপি স্ট্যাটাস কোড 
 * (400, 401, 404, 422) সহ এরর থ্রো করার আধুনিক প্যাটার্ন।
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * .env থেকে JWT_SECRET রিড করে ক্রিপ্টোগ্রাফিক বাফারে কনভার্ট করে।
 */
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

/**
 * ইউজারের ডেটা এনকোড করে একটি সাইনড JWT স্ট্রিং তৈরি করে।
 * 
 * @param user ইউজারের বেসিক ইনফরমেশন
 * @returns 8 ঘন্টার মেয়াদী সাইনড টোকেন
 */
export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" }) // HMAC SHA-256 অ্যালগরিদম
    .setSubject(user.id) // ইউজারের ডাটাবেজ প্রাইমারি কী (sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`) // ৮ ঘন্টা (২৮,৮০০ সেকেন্ড)
    .sign(getSecret());
}

/**
 * সাইনড JWT টোকেন ডিকোড ও ভেরিফাই করে ইউজারের সেশন অবজেক্ট উদ্ধার করে।
 */
export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });

    if (!payload.sub) return null;

    return {
      id: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: payload.role === "ADMIN" ? "ADMIN" : "AGENT",
    };
  } catch {
    // টোকেন ট্যাম্পার করা হলে বা মেয়াদ ফুরিয়ে গেলে নাল রিটার্ন হবে
    return null;
  }
}

/**
 * Next.js Server Components এবং Server Actions থেকে সেশন রিড করার হেল্পার।
 */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * সরাসরি 'Cookie' হেডার স্ট্রিং থেকে নির্দিষ্ট কুকির মান ডিকোড করে।
 * কোনো অতিরিক্ত হেভি লাইব্রেরি ছাড়া খাঁটি ও দ্রুতগতির পার্সার।
 */
function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }

  return undefined;
}

/**
 * API Route Handler-এর ইনকামিং Request অবজেক্ট থেকে সেশন ইউজার নির্ণয় করে।
 */
export async function getSessionFromRequest(
  request: Request,
): Promise<SessionUser | null> {
  const token = readCookie(
    request.headers.get("cookie"),
    SESSION_COOKIE_NAME,
  );
  if (!token) return null;
  return verifySession(token);
}

/**
 * অথেন্টিকেশন গার্ড: রিকোয়েস্টে ভ্যালিড সেশন না থাকলে সাথে সাথে 401 HttpError থ্রো করে।
 */
export async function requireAuthFromRequest(
  request: Request,
): Promise<SessionUser> {
  const user = await getSessionFromRequest(request);
  if (!user) throw new HttpError(401, "Authentication required");
  return user;
}

/**
 * লগইন সফল হলে ব্রাউজারে সিকিউর HttpOnly সেশন কুকি সেট করে।
 */
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true, // XSS অ্যাটাক থেকে টোকেন চুরি সম্পূর্ণ অসম্ভব
    secure: process.env.NODE_ENV === "production", // প্রোডাকশনে শুধুমাত্র HTTPS-এ সেন্ড হবে
    sameSite: "lax", // ক্রস-সাইট CSRF প্রতিরোধক পলিসি
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * লগআউটের সময় কুকি ডিলিট করে সেশন টার্মিনেট করে।
 */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

/**
 * Next.js এর ইন্টারনাল রিডাইরেক্ট বা নট-ফাউন্ড সিগন্যাল ডিটেক্ট করে।
 */
function isFrameworkSignal(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_");
}

/**
 * সেন্ট্রালাইজড এরর হ্যান্ডলার: যেকোনো এররকে ক্লায়েন্টের জন্য ক্লিন JSON ফরম্যাটে রূপান্তর করে।
 * 
 * ফ্রেমওয়ার্ক সতর্কতা: 
 * নেক্সট.জেএস সিগন্যাল রি-থ্রো করা অত্যন্ত জরুরি, অন্যথায় redirect() কাজ করবে না।
 */
export function toErrorResponse(error: unknown): Response {
  // নেক্সট.জেএস রিডাইরেক্ট সিগন্যাল অক্ষত রাখা হচ্ছে
  if (isFrameworkSignal(error)) throw error;

  // বিজনেস লজিক থেকে আসা কাস্টম HttpError হ্যান্ডলিং (400, 401, 404, 422)
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  // অপ্রত্যাশিত কোনো সার্ভার ক্র্যাশ হলে কনসোলে লগ করে সেফ 500 রেসপন্স
  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
