"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS, statusLabel } from "@/components/status-badge";

/**
 * Only the transitions the state machine allows are offered, so the UI and the
 * server rule cannot drift apart — the list is computed on the server from
 * ALLOWED_TRANSITIONS and passed down as a prop.
 */
export function StatusControl({
  ticketId,
  status,
  allowed,
}: {
  ticketId: string;
  status: string;
  allowed: string[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function change(nextStatus: string) {
    setPending(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not change the status");
      }

      toast.success(`Moved to ${statusLabel(nextStatus)}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not change the status",
      );
    } finally {
      setPending(false);
    }
  }

  if (allowed.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This ticket is closed and cannot be moved.
      </p>
    );
  }

  return (
    <Select
      items={STATUS_LABELS}
      value={status}
      onValueChange={(value) => change(String(value))}
      disabled={pending}
    >
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={status} disabled>
          {statusLabel(status)} (current)
        </SelectItem>
        {allowed.map((next) => (
          <SelectItem key={next} value={next}>
            Move to {statusLabel(next)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
