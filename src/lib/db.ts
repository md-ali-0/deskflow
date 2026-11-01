/**
 * ============================================================================
 *               DESKFLOW - PRISMA 7 DATABASE CLIENT (SINGLETON PATTERN)
 * ============================================================================
 * 
 * [আর্কিটেকচারাল গুরুত্ব / Architecture & Interview Value]:
 * ডাটাবেজ কানেকশন ম্যানেজমেন্টের ক্ষেত্রে এই ফাইলটি একটি ক্লাসিক "Singleton Pattern"
 * এর বাস্তবায়ন।
 * 
 * [ইন্টারভিউ স্পেশাল পয়েন্ট / Key Talking Points for Interview]:
 * ১. Prisma 7 & Driver Adapters (@prisma/adapter-pg):
 *    - Prisma 7-এ প্রচলিত বাইনারি ইঞ্জিনের পাশাপাশি জাভাস্ক্রিপ্ট নেটিভ ড্রাইভার অ্যাডাপ্টার 
 *      চালু হয়েছে। `@prisma/adapter-pg` ব্যবহার করায় কানেকশন পুলে মেমরি ও সিপিইউ খরচ 
 *      কমে যায় এবং সার্ভারলেস ও এজ এনভায়রনমেন্টে দ্রুততম সময়ে কাজ করে।
 * 
 * ২. Hot Reloading ও Connection Pool Exhaustion সমস্যা:
 *    - Next.js ডেভেলপমেন্ট মোডে (`next dev`) ফাইল সেভ করার সাথে সাথে মডিউল রি-কম্পাইল করে।
 *    - যদি আমরা সাধারণ `export const prisma = new PrismaClient()` লিখতাম, তবে প্রতিবার ফাইল 
 *      সেভ করার সাথে সাথে নতুন ডাটাবেজ কানেকশন পুল তৈরি হতো।
 *    - মাত্র কয়েক মিনিটে PostgreSQL সার্ভার `FATAL: too many connections` এরর দিয়ে ক্র্যাশ করত!
 * 
 * ৩. 'globalThis' ক্যাশিং সমাধান:
 *    - নোড.জেএসের গ্লোবাল স্কোপ (`globalThis`)-এ বিদ্যমান ক্লায়েন্টটি সেভ রাখা হয়। 
 *      মডিউল যতবারই রিলোড হোক না কেন, ডাটাবেজ ক্লায়েন্ট ইন্সট্যান্স সবসময় একটাই থাকে (Singleton)।
 *    - প্রোডাকশন মোডে হট-রিলোড হয় না বলে এই ক্যাশিং বাদ রাখা হয়।
 * ============================================================================
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * PostgreSQL অ্যাডাপ্টারসহ নতুন PrismaClient তৈরির ফ্যাক্টরি ফাংশন।
 */
const createClient = () =>
  new PrismaClient({
    // আধুনিক ড্রাইভার অ্যাডাপ্টার ব্যবহার করে কানেকশন স্ট্রিং পাস করা হচ্ছে
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

// টাইপস্ক্রিপ্ট টাইপ সেফটির সাথে Node.js এর globalThis অবজেক্টকে রেফার করা হচ্ছে
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

// গ্লোবালে আগে থেকে ক্লায়েন্ট থাকলে সেটিই ব্যবহার করবে, না থাকলে নতুন তৈরি করবে (Singleton)
export const prisma = globalForPrisma.prisma ?? createClient();

// ডেভেলপমেন্ট মোডে গ্লোবাল অবজেক্টে ক্লায়েন্টটি সংরক্ষণ করে কানেকশন লিক প্রতিরোধ করা হলো
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
