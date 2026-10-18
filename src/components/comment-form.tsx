"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CommentForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setPending(true);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: String(form.get("body") ?? "").trim(),
          isInternal: form.get("isInternal") === "on",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (response.status === 401) {
        toast.error(payload.error ?? "Your session expired. Sign in again.");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not post the reply");
      }

      formRef.current?.reset();
      toast.success("Reply posted");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not post the reply",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        name="body"
        required
        maxLength={5000}
        rows={3}
        placeholder="Write a reply…"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            id="isInternal"
            name="isInternal"
            type="checkbox"
            className="size-4 rounded border-input accent-primary"
          />
          <Label htmlFor="isInternal" className="text-sm text-muted-foreground">
            Internal note (hidden from the requester)
          </Label>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Posting…" : "Post reply"}
        </Button>
      </div>
    </form>
  );
}
