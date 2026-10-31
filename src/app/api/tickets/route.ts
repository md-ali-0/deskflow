/**
 * ============================================================================
 *               DESKFLOW - TICKETS API CONTROLLER (ROUTE HANDLER)
 * ============================================================================
 * 
 * [আর্কিটেকচারাল সারসংক্ষেপ / Thin Controller Pattern]:
 * Next.js App Router আর্কিটেকচারে এটি একটি ক্লাসিক "Thin Controller"।
 * এই ফাইলের একমাত্র দায়িত্ব হলো:
 * ১. ইনকামিং HTTP রিকোয়েস্ট রিসিভ করা।
 * ২. অথেন্টিকেশন ও Zod ভ্যালিডেশন সম্পন্ন করা।
 * ৩. সার্ভিস লেয়ারে (`ticket.service.ts`) কল ডেলিগেট করা।
 * ৪. স্ট্যান্ডার্ড JSON রেসপন্স অথবা ইউনিফাইড এরর রেসপন্স ক্লায়েন্টকে ফেরত পাঠানো।
 * 
 * [ইন্টারভিউ স্পেশাল পয়েন্ট / Key Talking Points for Interview]:
 * - Separation of Concerns: কন্ট্রোলারের ভেতর কোনো সরাসরি SQL বা Prisma কোয়েরি লেখা হয়নি।
 * - Resilient JSON Parsing: `request.json().catch(() => null)` দিয়ে বডি পার্সিং সুরক্ষিত 
 *   করা হয়েছে, যাতে ব্রাউজার থেকে ইনভ্যালিড সিনট্যাক্স বা ফাঁকা পেলোড আসলেও সার্ভার ক্র্যাশ না করে।
 * - HTTP Status Standards: নতুন রিসোর্স তৈরি হলে 201 Created, ভ্যালিডেশন এররে 422 Unprocessable।
 * ============================================================================
 */

import { requireAuthFromRequest, toErrorResponse } from "@/lib/auth";
import {
  createTicketSchema,
  listTicketsQuerySchema,
} from "@/lib/validation/ticket";
import { createTicket, listTickets } from "@/services/ticket.service";

/**
 * GET /api/tickets - ফিল্টারিং ও সার্চসহ টিকিট তালিকা পাওয়ার এন্ডপয়েন্ট
 */
export async function GET(request: Request) {
  try {
    // ধাপ ১: অথেন্টিকেশন ভেরিফিকেশন (ব্যর্থ হলে স্বয়ংক্রিয় 401 থ্রো হবে)
    await requireAuthFromRequest(request);

    // ধাপ ২: URL কোয়েরি প্যারামিটার সংগ্রহ ও Zod স্কিমায় ভ্যালিডেশন
    const url = new URL(request.url);
    const parsed = listTicketsQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );

    // কোয়েরি প্যারামিটারে অনাকাঙ্ক্ষিত কিছু থাকলে 422 আনপ্রসেসএবল রেসপন্স
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid query", issues: parsed.error.issues },
        { status: 422 },
      );
    }

    // ধাপ ৩: সার্ভিস লেয়ার থেকে টিকিট লিস্ট ফেচ করা
    const tickets = await listTickets(parsed.data);
    return Response.json({ tickets });
  } catch (error) {
    // ইউনিফাইড সেন্ট্রালাইজড এরর হ্যান্ডলার
    return toErrorResponse(error);
  }
}

/**
 * POST /api/tickets - নতুন টিকিট তৈরি করার এন্ডপয়েন্ট
 */
export async function POST(request: Request) {
  try {
    // ধাপ ১: অথেন্টিকেশন চেক এবং রিকোয়েস্টকারী ইউজারের অবজেক্ট সংগ্রহ
    const user = await requireAuthFromRequest(request);

    // ধাপ ২: পেলোড রিড ও নিরাপদ JSON পার্সিং
    const body = await request.json().catch(() => null);
    const parsed = createTicketSchema.safeParse(body);

    // ইনপুট ভ্যালিডেশন ফেইল করলে ফিল্ড-লেভেল এরর মেসেজসহ 422 রেসপন্স
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 422 },
      );
    }

    // ধাপ ৩: বিজনেস সার্ভিসকে কল করা (SLA ক্যালকুলেশন, লোড ব্যালেন্সিং, AI ট্রায়াজ ঘটবে ভেতরে)
    const ticket = await createTicket(parsed.data, user.id);

    // সফলভাবে রিসোর্স তৈরির জন্য HTTP 201 Created স্ট্যাটাস
    return Response.json({ ticket }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
