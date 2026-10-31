/**
 * ============================================================================
 *               DESKFLOW - NEXT.JS 16 EDGE PROXY (MIDDLEWARE / AUTH GUARD)
 * ============================================================================
 * 
 * [আর্কিটেকচারাল সারসংক্ষেপ / Next.js 16 Architecture]:
 * এই ফাইলটি অ্যাপ্লিকেশনের গেইটকিপার (Gatekeeper)। ক্লায়েন্ট থেকে সার্ভারে যেকোনো 
 * সংরক্ষিত পেজ বা API রিকোয়েস্ট পৌঁছানোর পূর্বেই এটি এজ লেয়ারে (Edge Layer) রান করে।
 * 
 * [ইন্টারভিউ স্পেশাল পয়েন্ট / Key Talking Points for Interview]:
 * ১. Next.js 16 Naming Convention:
 *    - Next.js 16-এ চিরাচরিত `middleware.ts` এর নাম পরিবর্তন হয়ে `proxy.ts` হয়েছে 
 *      এবং ফাংশনের নাম `proxy(request)`। এটি ইন্টারভিউয়ারকে জানালে প্রমাণিত হবে যে 
 *      আপনি ফ্রেমওয়ার্কের একদম লেটেস্ট রিলিজ সম্পর্কে পুরোপুরি অবগত!
 * ২. Edge Runtime & 'jose' লাইব্রেরি নির্বাচন:
 *    - কেন আমরা `jsonwebtoken` ব্যবহার করিনি?
 *      কারণ Edge Runtime একটি লাইটওয়েট V8 আইসোলেটে চলে যেখানে Node.js-এর ফুল ইঞ্জিন 
 *      (যেমন: C++ বাইন্ডিংস বা `crypto` মডিউল) থাকে না।
 *    - 'jose' সম্পূর্ণ ব্রাউজার ও এজ স্ট্যান্ডার্ড Web Cryptography API (`crypto.subtle`) 
 *      ব্যবহার করে, যার মেমরি সাইজ ক্ষুদ্র এবং পারফরম্যান্স অবিশ্বাস্যরকম দ্রুত (Zero Cold Start)।
 * ৩. স্মার্ট ডুয়াল রাউটিং রেসপন্স (Smart Dual Routing):
 *    - রিকোয়েস্ট যদি API কল হয় (`/api/...`): রিটার্ন করে HTTP 401 JSON। 
 *      (এতে ক্লায়েন্ট-সাইড fetch কল কোনো অবাঞ্ছিত HTML রিডাইরেক্ট পেয়ে ক্র্যাশ করে না)।
 *    - রিকোয়েস্ট যদি UI পেজ হয় (`/dashboard`): ব্রাউজারকে রিডাইরেক্ট করে `/login?next=...` এ। 
 *      লগইন সফল হলে ইউজার স্বয়ংক্রিয়ভাবে তার কাঙ্ক্ষিত পেজে পৌঁছে যাবে।
 * ৪. অপ্টিমাইজড `config.matcher`:
 *    - পাবলিক পেজ (যেমন: `/login`, `/register`), ইমেজ ও স্ট্যাটিক ফাইলে মিডলওয়্যার ফায়ার হয় না। 
 *      শুধুমাত্র প্রোটেক্টেড রুটে মিডলওয়্যার রান করে সার্ভার রিসোর্স বাঁচায়।
 * ============================================================================
 */

import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/session";

/**
 * কুকি থেকে আসা JWT টোকেনটি ভ্যালিড এবং অপরিবর্তিত কি না তা ক্রিপ্টোগ্রাফিক্যালি পরীক্ষা করে।
 * 
 * @param token কুকির ভেতর সংরক্ষিত JWT স্ট্রিং
 * @returns boolean (টোকেন ভ্যালিড ও আন-এক্সপায়ারড হলে true)
 */
async function hasValidToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    // JWT_SECRET স্ট্রিংটিকে Web Crypto কম্প্যাটিবল Uint8Array বাফারে রূপান্তর
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
    // HMAC-SHA256 অ্যালগরিদমে সিগনেচার ভেরিফিকেশন ও এক্সপাইরি চেক
    await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return true;
  } catch {
    // টোকেন ফেক, সিগনেচার মিসম্যাচ বা মেয়াদোত্তীর্ণ হলে সরাসরি false
    return false;
  }
}

/**
 * Next.js 16 এজ মিডলওয়্যার প্রক্সি হ্যান্ডলার।
 * ইনকামিং প্রতিটি ম্যাচড রিকোয়েস্ট এই ফাংশনের মধ্য দিয়ে প্রবাহিত হয়।
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // কুকি থেকে সেশন টোকেন নিয়ে সিগনেচার চেক করা হচ্ছে
  if (await hasValidToken(request.cookies.get(SESSION_COOKIE_NAME)?.value)) {
    // টোকেন সঠিক থাকলে রিকোয়েস্টকে তার গন্তব্যে যেতে দাও
    return NextResponse.next();
  }

  // যদি ইউজার আন-অথেন্টিকেটেড হয় এবং সে কোনো API এন্ডপয়েন্টে হিট করে
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }, // 401 Unauthorized স্ট্যাটাস
    );
  }

  // যদি ইউজার কোনো প্রোটেক্টেড ওয়েব পেজে ভিজিট করে, তবে তাকে লগইন পেজে রিডাইরেক্ট করা হয়
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  // ইউজার যে পেজে যেতে চেয়েছিল তা 'next' কোয়েরি প্যারামিটারে সংরক্ষণ (Seamless UX)
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

/**
 * কোন কোন রাউটের ক্ষেত্রে এই মিডলওয়্যার প্রক্সি কার্যকর হবে তার কনফিগারেশন।
 * পাবলিক পেজ এবং স্ট্যাটিক অ্যাসেট বাদ দিয়ে শুধুমাত্র সিকিউর রাউটগুলো লিস্টেড।
 */
export const config = {
  matcher: [
    "/",
    "/tickets/:path*",
    "/dashboard/:path*",
    "/api/tickets/:path*",
    "/api/dashboard",
    "/api/auth/me",
  ],
};
