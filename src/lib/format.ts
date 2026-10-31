/**
 * ============================================================================
 *                    DESKFLOW - FORMATTING & SLA TIME UTILITIES
 * ============================================================================
 * 
 * [আর্কিটেকচারাল সারসংক্ষেপ / Architecture Overview]:
 * এই মডিউলটি UI এবং ড্যাশবোর্ডে তারিখ, সময়, SLA কাউন্টডাউন, ওভারডিউ ইন্ডিকেটর 
 * এবং ইউজার অবতার ইনিশিয়াল সুন্দরভাবে উপস্থাপনের কাজ করে।
 * 
 * [ইন্টারভিউ স্পেশাল পয়েন্ট / Key Talking Points for Interview]:
 * ১. Zero Bundle Bloat (Intl.DateTimeFormat):
 *    - ভারী থার্ড-পার্টি লাইব্রেরি (যেমন: moment.js বা date-fns) বর্জন করে ব্রাউজার ও 
 *      Node.js-এর স্ট্যান্ডার্ড `Intl.DateTimeFormat` ব্যবহার করা হয়েছে। 
 *      এতে অ্যাপ্লিকেশনের বান্ডেল সাইজ একদম লাইটওয়েট থাকে।
 * ২. SLA Clock Freezing (`SLA_STOPPED`):
 *    - টিকিট 'RESOLVED' বা 'CLOSED' হলে SLA ঘড়ি থেমে যায়। 
 *      অতীতে ডেডলাইন পার হয়ে গেলেও সলভড টিকিটকে UI-তে ভুলেও লাল বা Overdue দেখানো হয় না।
 * ৩. স্মার্ট রিলেটিভ টাইম ও ওভারডিউ ডিটেকশন (`dueLabel`):
 *    - ডেডলাইন কত ঘন্টা/দিন বাকি বা কত ঘন্টা/দিন আগে অতিক্রান্ত হয়েছে তা স্বয়ংক্রিয়ভাবে হিসাব করে।
 *    - `overdue: true` ফ্ল্যাগ পাঠিয়ে ফ্রন্টএন্ডে ওয়ার্নিং বা লাল ব্যাজ রেন্ডার করায়।
 * ============================================================================
 */

// ব্রিটিশ স্ট্যান্ডার্ড (DD Mon YYYY, HH:mm) ডেট ও টাইম ফরম্যাটার
const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// শুধুমাত্র ডেট ফরম্যাটার (DD Mon YYYY)
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/**
 * ইনপুট স্ট্রিং বা ডেট অবজেক্টকে নির্ভরযোগ্য জাভাস্ক্রিপ্ট Date অবজেক্টে রূপান্তর করে।
 */
function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * ডেট এবং টাইম উভয়টি ফরম্যাট করে (যেমন: "18 Oct 2026, 14:30")।
 */
export function formatDateTime(value: Date | string): string {
  return dateTimeFormatter.format(toDate(value));
}

/**
 * শুধুমাত্র তারিখ ফরম্যাট করে (যেমন: "18 Oct 2026")।
 */
export function formatDate(value: Date | string): string {
  return dateFormatter.format(toDate(value));
}

// যেসব স্ট্যাটাসে পৌঁছালে SLA ক্লক ফ্রিজ হয়ে যায়
const SLA_STOPPED = new Set(["RESOLVED", "CLOSED"]);

/**
 * একটি টিকিটের ডেডলাইন অনুযায়ী হিউম্যান-রিডেবল লেবেল ও ওভারডিউ স্ট্যাটাস প্রদান করে।
 * 
 * @param dueAt টিকিটের সমাধানের নির্ধারিত ডেডলাইন
 * @param status টিকিটের বর্তমান স্ট্যাটাস
 * @param now বর্তমান সময় (ইউনিট টেস্টিংয়ের সুবিধার্থে ডিফল্ট প্যারামিটার)
 * @returns { text: string; overdue: boolean }
 */
export function dueLabel(
  dueAt: Date | string,
  status: string,
  now: Date = new Date(),
): { text: string; overdue: boolean } {
  const due = toDate(dueAt);

  // সলভড বা ক্লোজড টিকিটের SLA ঘড়ি থেমে যাবে, নিরপেক্ষভাবে কেবল তারিখ প্রদর্শিত হবে
  if (SLA_STOPPED.has(status)) {
    return { text: formatDate(due), overdue: false };
  }

  // ডেডলাইনের বাকি সময়ের ব্যবধান (মিলি-সেকেন্ডে)
  const diffMs = due.getTime() - now.getTime();
  const hours = Math.round(diffMs / 3_600_000); // ১ ঘন্টা = ৩,৬০০,০০০ মিলি-সেকেন্ড

  // ডেডলাইন পার হয়ে গেলে (Overdue Breach)
  if (diffMs < 0) {
    const late = Math.abs(hours);
    return {
      text: late >= 24 ? `${Math.floor(late / 24)}d overdue` : `${late}h overdue`,
      overdue: true, // লাল ব্যাজ ট্রিগার করবে
    };
  }

  // ডেডলাইন এখনও বাকি থাকলে
  return {
    text: hours >= 24 ? `in ${Math.floor(hours / 24)}d` : `in ${hours}h`,
    overdue: false,
  };
}

/**
 * টিকিটটি SLA ভঙ্গ করেছে কি না তা পরীক্ষা করে সহজ বুলিয়ান রিটার্ন দেয়।
 */
export function isOverdue(dueAt: Date | string, status: string): boolean {
  return dueLabel(dueAt, status).overdue;
}

/**
 * "TKT-0012" ফরম্যাটকে সংক্ষেপে UI-ফ্রেন্ডলি "#0012" এ কনভার্ট করে।
 */
export function shortNumber(number: string): string {
  return number.replace(/^TKT-/, "#");
}

/**
 * ইউজারের নামের প্রথম দুই শব্দের আদ্যক্ষর নিয়ে অবতারের জন্য ইনিশিয়াল প্রস্তুত করে।
 * উদাহরণ: "Ali Hasan" -> "AH"
 */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
