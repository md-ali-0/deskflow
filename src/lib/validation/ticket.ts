/**
 * ============================================================================
 *               DESKFLOW - ZOD VALIDATION & SCHEMA DEFINITION
 * ============================================================================
 * 
 * [আর্কিটেকচারাল গুরুত্ব / Architecture & Interview Value]:
 * ডেটা ভ্যালিডেশনের ক্ষেত্রে Zod লাইব্রেরির ব্যবহার আধুনিক ফুলস্ট্যাক অ্যাপ্লিকেশনের অন্যতম বেস্ট প্র্যাকটিস।
 * 
 * [ইন্টারভিউ স্পেশাল পয়েন্ট / Key Talking Points for Interview]:
 * ১. Compile-time vs Runtime Safety:
 *    - TypeScript এর ইন্টারফেস বা টাইপ কম্পাইল করার পর জাভাস্ক্রিপ্ট রানটাইমে মুছে যায় (Type Erasure)। 
 *      তাই ক্লায়েন্ট কোনো ম্যালিশিয়াস বা ভুল টাইপের পেলোড পাঠালে পিওর টাইপস্ক্রিপ্ট তা আটকাতে পারে না।
 *    - Zod রানটাইমে প্রতিটি ফিল্ড পুঙ্খানুপুঙ্খভাবে ভ্যালিডেট করে এবং একই সাথে `z.infer` দিয়ে 
 *      টাইপস্ক্রিপ্ট টাইপ অটো-জেনারেট করে (Single Source of Truth)।
 * ২. সিকিউরিটি বাফার ও DoS প্রিভেনশন (Payload Bounds):
 *    - প্রতিটি স্ট্রিংয়ে মিনিমাম এবং ম্যাক্সিমাম লেন্থ বাউন্ডারি দেওয়া (যেমন: description max 5000)। 
 *      এটি বিশাল আকারের পেলোড পাঠিয়ে সার্ভার মেমরি জ্যাম (Denial of Service) প্রতিরোধ করে।
 *    - পাসওয়ার্ডের জন্য `max(72)`: 
 *      bcrypt অ্যালগরিদম ৭২ বাইটের বেশি বড় পাসওয়ার্ড প্রসেস করতে পারে না। ৭২-এর বেশি ইনপুট দেওয়া 
 *      DoS অ্যাটাকের একটি মাধ্যম হতে পারে, যা এই স্কিমা শুরুতেই আটকে দেয়।
 * ৩. UUID Validation (`z.uuid()`):
 *    - ডাটাবেজে হিট করার আগেই ইনপুট আইডিটি একটি ভ্যালিড UUID কি না তা যাচাই করে। 
 *      ভুল ফরম্যাটের আইডি থাকলে ডাটাবেজ অপ্রয়োজনীয় কোয়েরি এক্সিকিউশন থেকে রক্ষা পায়।
 * ============================================================================
 */

import { z } from "zod";

/**
 * ইউজার রেজিস্ট্রেশন স্কিমা (নাম, ইমেইল, পাসওয়ার্ড)
 */
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be 80 characters or fewer"),
  email: z.email("Enter a valid email address").max(254), // RFC 5321 অনুযায়ী স্ট্যান্ডার্ড ইমেইল লেন্থ
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or fewer"), // bcrypt নিরাপদ ক্যাপাসিটি
});

/**
 * লগইন ইনপুট ভ্যালিডেশন স্কিমা
 */
export const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(254),
  password: z.string().min(1, "Password is required").max(72),
});

/**
 * নতুন টিকিট তৈরির ইনপুট স্কিমা
 */
export const createTicketSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(255),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
  categoryId: z.uuid("Invalid category ID format"), // সঠিক UUID ফরম্যাট যাচাই
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

/**
 * টিকিটের স্ট্যাটাস পরিবর্তনের ভ্যালিডেশন স্কিমা
 */
export const statusChangeSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

/**
 * পাবলিক রিপ্লাই বা ইন্টারনাল নোট কমেন্ট স্কিমা
 */
export const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment body cannot be empty").max(5000),
  isInternal: z.boolean().default(false), // ট্রু হলে কেবল এজেন্ট ও অ্যাডমিন দেখতে পাবে
});

/**
 * ড্যাশবোর্ড ও টিকিট টেবিল ফিল্টারিং ও সার্চের কুয়েরি প্যারামিটার স্কিমা
 */
export const listTicketsQuerySchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedToId: z.uuid().optional(),
  q: z.string().trim().max(120).optional(), // সার্চ কিওয়ার্ডের সর্বোচ্চ দৈর্ঘ্য
});

// Zod স্কিমা থেকে টাইপস্ক্রিপ্ট টাইপ ইনফার করা হলো (জিরো ডুপ্লিকেশন)
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type StatusChangeInput = z.infer<typeof statusChangeSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
