/**
 * ============================================================================
 *           DESKFLOW - REAL-TIME DASHBOARD METRICS API CONTROLLER
 * ============================================================================
 * 
 * [আর্কিটেকচারাল সারসংক্ষেপ / Architecture Overview]:
 * এই এন্ডপয়েন্টটি ড্যাশবোর্ডের সামারি কার্ডগুলোর জন্য দ্রুতগতির রিয়েল-টাইম 
 * এগ্রিগেশন মেট্রিক্স প্রদান করে (OPEN, IN_PROGRESS, RESOLVED, CLOSED, OVERDUE)।
 * 
 * [ইন্টারভিউ স্পেশাল পয়েন্ট / Key Talking Points for Interview]:
 * - সার্ভিস লেয়ারে `Promise.all` দিয়ে ডাটাবেজ লেভেলে সমান্তরাল কাউন্ট কোয়েরি চালানো হয়, 
 *   যার ফলে ডাটাবেজ রাউন্ড-ট্রিপ ও রেসপন্স টাইম সর্বনিম্ন (সাধারণত < 15ms) থাকে।
 * ============================================================================
 */

import { requireAuthFromRequest, toErrorResponse } from "@/lib/auth";
import { getDashboardCounts } from "@/services/ticket.service";

/**
 * GET /api/dashboard - ড্যাশবোর্ড কাউন্টার ডেটা ফেচ
 */
export async function GET(request: Request) {
  try {
    // শুধুমাত্র অথেনটিকেটেড ইউজারদের ড্যাশবোর্ড মেট্রিক্স দেখার অনুমতি
    await requireAuthFromRequest(request);

    // সার্ভিস লেয়ার থেকে সমান্তরালে কাউন্ট রেজাল্ট সংগ্রহ
    const counts = await getDashboardCounts();
    return Response.json(counts);
  } catch (error) {
    return toErrorResponse(error);
  }
}
