import { Badge } from "@/components/ui/badge";

/**
 * One place for how a status or priority is spelled and coloured. Everything
 * else in the UI reads from here, so renaming a label is a one-line change.
 */
export const STATUS_LABELS = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
} as const;

export const PRIORITY_LABELS = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
} as const;

const STATUS_VARIANT = {
  OPEN: "secondary",
  IN_PROGRESS: "default",
  RESOLVED: "outline",
  CLOSED: "ghost",
} as const;

const PRIORITY_VARIANT = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
} as const;

export type Status = keyof typeof STATUS_LABELS;
export type Priority = keyof typeof PRIORITY_LABELS;

export const STATUS_OPTIONS = Object.keys(STATUS_LABELS) as Status[];
export const PRIORITY_OPTIONS = Object.keys(PRIORITY_LABELS) as Priority[];

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as Status] ?? status;
}

export function priorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority as Priority] ?? priority;
}

export function StatusBadge({ status }: { status: string }) {
  const key = (status in STATUS_LABELS ? status : "OPEN") as Status;
  return <Badge variant={STATUS_VARIANT[key]}>{STATUS_LABELS[key]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const key = (priority in PRIORITY_LABELS ? priority : "MEDIUM") as Priority;
  return <Badge variant={PRIORITY_VARIANT[key]}>{PRIORITY_LABELS[key]}</Badge>;
}
