/**
 * ============================================================================
 *           DESKFLOW - TICKET COMMENTS CONTROLLER (SUB-RESOURCE ROUTE)
 * ============================================================================
 * 
 * [আর্কিটেকচারাল সারসংক্ষেপ / Nested RESTful Resource]:
 * RESTful আর্কিটেকচার অনুযায়ী প্যারেন্ট-চাইল্ড রিসোর্স রিলেশন বোঝাতে 
 * `/api/tickets/[id]/comments` এন্ডপয়েন্টটি ডিজাইন করা হয়েছে।
 * 
 * [ইন্টারভিউ স্পেশাল পয়েন্ট / Key Talking Points for Interview]:
 * ১. পাবলিক বনাম ইন্টারনাল কমেন্ট (Role Visibility):
 *    - `isInternal: false` -> পাবলিক রিপ্লাই, যা গ্রাহক এবং সাপোর্ট টিম সবাই দেখতে পায়।
 *      (এটিই রেজোলিউশন গার্ডে কোয়ালিটি রিকোয়ারমেন্ট পূরণ করে)।
 *    - `isInternal: true` -> ইন্টারনাল নোট, যা গ্রাহকের কাছ থেকে গোপন থাকে এবং শুধুমাত্র 
 *      এজেন্ট ও অ্যাডমিনরা নিজেদের মধ্যে টেকনিক্যাল আলোচনার জন্য ব্যবহার করে।
 * ২. অ্যাটমিক ট্রানজিশন সার্ভিস:
 *    - সার্ভিস লেয়ারে ডাটাবেজ ট্রানজিশন (`$transaction`) দিয়ে একই সাথে কমেন্ট তৈরি 
 *      এবং অ্যাক্টিভিটি লগে 'COMMENT_ADDED' এন্ট্রি নিশ্চিত করা হয়।
 * ============================================================================
 */

import { requireAuthFromRequest, toErrorResponse } from "@/lib/auth";
import { commentSchema } from "@/lib/validation/ticket";
import { addComment } from "@/services/ticket.service";

// Next.js লেটেস্ট প্রমিজ প্যারামস টাইপ
type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/tickets/[id]/comments - টিকিটে কমেন্ট বা নোট যুক্ত করা
 */
export async function POST(request: Request, { params }: Context) {
  try {
    // সেশন থেকে ইউজার অবজেক্ট সংগ্রহ
    const user = await requireAuthFromRequest(request);
    const { id } = await params;

    // পেলোড পার্সিং ও Zod ভ্যালিডেশন
    const body = await request.json().catch(() => null);
    const parsed = commentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 422 },
      );
    }

    // সার্ভিসের মাধ্যমে কমেন্ট এবং অ্যাক্টিভিটি লগে অ্যাটমিক ইনসার্ট
    const comment = await addComment(
      id,
      user.id,
      parsed.data.body,
      parsed.data.isInternal,
    );

    // রিসোর্স সফলভাবে সৃষ্টির প্রতীক 201 Created স্ট্যাটাস
    return Response.json({ comment }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
