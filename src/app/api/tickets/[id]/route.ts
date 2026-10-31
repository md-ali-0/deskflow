/**
 * ============================================================================
 *         DESKFLOW - INDIVIDUAL TICKET & STATUS TRANSITION CONTROLLER
 * ============================================================================
 * 
 * [আর্কিটেকচারাল সারসংক্ষেপ / Architecture Overview]:
 * এই ডায়নামিক রাউট হ্যান্ডলারটি নির্দিষ্ট আইডি (`/api/tickets/[id]`) অনুযায়ী:
 * ১. GET: টিকিটের পূর্ণাঙ্গ হিস্ট্রি, কমেন্টস ও অ্যাক্টিভিটি টাইমলাইন রিটার্ন করে।
 * ২. PATCH: স্টেট মেশিন ও রেজোলিউশন গার্ড মেনে টিকিটের স্ট্যাটাস পরিবর্তন করে।
 * 
 * [ইন্টারভিউ স্পেশাল পয়েন্ট / Key Talking Points for Interview]:
 * ১. Next.js 15/16 Asynchronous Params (`await params`):
 *    - Next.js-এর সর্বশেষ সংস্করণে রাউট প্যারামিটার (`params`) একটি সিনক্রোনাস অবজেক্ট নয়, 
 *      বরং এটি একটি Promise (`type Context = { params: Promise<{ id: string }> }`)।
 *    - তাই `const { id } = await params;` এভাবে await করা আবশ্যক। 
 *      এটি না করলে Next.js কম্পাইলেশন ও রানটাইম ওয়ার্নিং/এরর দেবে।
 * ২. HTTP PATCH Method Selection:
 *    - পুরো টিকিটকে সম্পূর্ণ রিপ্লেস (PUT) না করে শুধুমাত্র স্ট্যাটাস আংশিক পরিবর্তন 
 *      করার জন্য RESTful স্ট্যান্ডার্ড অনুযায়ী PATCH মেথড ব্যবহার করা হয়েছে।
 * ৩. সার্ভার স্টেট মেশিন গার্ড:
 *    - PATCH এন্ডপয়েন্টে `transitionStatus` কল করা হয় যা নিশ্চিত করে কোনো ক্লায়েন্ট 
 *      নিষিদ্ধ স্ট্যাটাসে টিকিট রূপান্তর করতে পারছে না।
 * ============================================================================
 */

import { requireAuthFromRequest, toErrorResponse } from "@/lib/auth";
import { statusChangeSchema } from "@/lib/validation/ticket";
import { getTicket, transitionStatus } from "@/services/ticket.service";

// Next.js লেটেস্ট কনভেনশন অনুযায়ী অ্যাসিনক্রোনাস প্যারামস টাইপ
type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/tickets/[id] - নির্দিষ্ট টিকিটের বিবরণ ও অডিট ট্রেইল লোড
 */
export async function GET(request: Request, { params }: Context) {
  try {
    // অথেন্টিকেশন ভেরিফিকেশন
    await requireAuthFromRequest(request);

    // Next.js 15/16 প্রমিজ প্যারামস থেকে টিকিটের আইডি ডিকনস্ট্রাক্ট
    const { id } = await params;

    // সার্ভিস থেকে সম্পূর্ণ টিকিট অবজেক্ট সংগ্রহ
    const ticket = await getTicket(id);
    return Response.json({ ticket });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * PATCH /api/tickets/[id] - স্টেট মেশিন ভ্যালিডেশন অনুযায়ী স্ট্যাটাস পরিবর্তন
 */
export async function PATCH(request: Request, { params }: Context) {
  try {
    // রিকোয়েস্টকারী এজেন্টের সেশন যাচাই
    const user = await requireAuthFromRequest(request);
    const { id } = await params;

    // পেলোড পার্সিং ও Zod ভ্যালিডেশন
    const body = await request.json().catch(() => null);
    const parsed = statusChangeSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 422 },
      );
    }

    // সার্ভিস লেয়ারের transitionStatus কল (স্টেট মেশিন ও রেজোলিউশন গার্ড কার্যকর হবে)
    const ticket = await transitionStatus(id, parsed.data.status, user.id);
    return Response.json({ ticket });
  } catch (error) {
    return toErrorResponse(error);
  }
}
