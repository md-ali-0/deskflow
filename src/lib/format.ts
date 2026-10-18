const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDateTime(value: Date | string): string {
  return dateTimeFormatter.format(toDate(value));
}

export function formatDate(value: Date | string): string {
  return dateFormatter.format(toDate(value));
}

/** Statuses that stop the SLA clock. */
const SLA_STOPPED = new Set(["RESOLVED", "CLOSED"]);

/**
 * Turns a due date into something a human can act on: "3d overdue",
 * "in 6h", or the plain date once the clock has stopped.
 */
export function dueLabel(
  dueAt: Date | string,
  status: string,
  now: Date = new Date(),
): { text: string; overdue: boolean } {
  const due = toDate(dueAt);

  if (SLA_STOPPED.has(status)) {
    return { text: formatDate(due), overdue: false };
  }

  const diffMs = due.getTime() - now.getTime();
  const hours = Math.round(diffMs / 3_600_000);

  if (diffMs < 0) {
    const late = Math.abs(hours);
    return {
      text: late >= 24 ? `${Math.floor(late / 24)}d overdue` : `${late}h overdue`,
      overdue: true,
    };
  }

  return {
    text: hours >= 24 ? `in ${Math.floor(hours / 24)}d` : `in ${hours}h`,
    overdue: false,
  };
}

export function isOverdue(dueAt: Date | string, status: string): boolean {
  return dueLabel(dueAt, status).overdue;
}

/** TKT-0001 → #0001, purely cosmetic. */
export function shortNumber(number: string): string {
  return number.replace(/^TKT-/, "#");
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
