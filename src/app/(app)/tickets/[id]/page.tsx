import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CommentForm } from "@/components/comment-form";
import { DetailSkeleton } from "@/components/page-skeleton";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { StatusControl } from "@/components/status-control";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, dueLabel, initials, shortNumber } from "@/lib/format";
import { HttpError } from "@/lib/auth";
import { ALLOWED_TRANSITIONS } from "@/lib/ticket-rules";
import { getTicket } from "@/services/ticket.service";

type Params = Promise<{ id: string }>;

const ACTION_LABELS: Record<string, string> = {
  TICKET_CREATED: "created the ticket",
  STATUS_CHANGED: "changed the status",
  COMMENT_ADDED: "replied",
};

async function TicketDetailContent({ params }: { params: Params }) {
  const { id } = await params;

  await connection();

  let ticket;
  try {
    ticket = await getTicket(id);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  }

  const allowed = ALLOWED_TRANSITIONS[ticket.status] ?? [];
  const due = dueLabel(ticket.dueAt, ticket.status);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/tickets"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← All tickets
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {shortNumber(ticket.number)}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {ticket.subject}
            </h1>
          </div>
          <StatusControl
            ticketId={ticket.id}
            status={ticket.status}
            allowed={allowed}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {ticket.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Conversation
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {ticket.comments.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No replies yet. A public reply is required before this ticket
                  can be resolved.
                </p>
              ) : (
                <ul className="space-y-4">
                  {ticket.comments.map((comment) => (
                    <li key={comment.id} className="flex gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {initials(comment.author.name)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">
                            {comment.author.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(comment.createdAt)}
                          </span>
                          {comment.isInternal && (
                            <Badge variant="outline">Internal</Badge>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {comment.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t pt-4">
                <CommentForm ticketId={ticket.id} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="text-right font-medium">
                    {ticket.category.name}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">SLA</dt>
                  <dd className="text-right">
                    {ticket.category.defaultSlaHours}h
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Due</dt>
                  <dd
                    className={
                      due.overdue
                        ? "text-right font-medium text-destructive"
                        : "text-right"
                    }
                  >
                    {formatDateTime(ticket.dueAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Requester</dt>
                  <dd className="text-right">{ticket.createdBy.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Assignee</dt>
                  <dd className="text-right">
                    {ticket.assignedTo?.name ?? "Unassigned"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd className="text-right">
                    {formatDateTime(ticket.createdAt)}
                  </dd>
                </div>
                {ticket.resolvedAt && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Resolved</dt>
                    <dd className="text-right">
                      {formatDateTime(ticket.resolvedAt)}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI triage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {ticket.aiCategory ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Suggestion</span>
                    <Badge variant="secondary">{ticket.aiCategory}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Source</span>
                    <span>
                      {ticket.aiConfidence
                        ? `Model · ${Math.round(ticket.aiConfidence * 100)}% confident`
                        : "Keyword fallback"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Chosen category</span>
                    <span>{ticket.aiAccepted ? "Matched" : "Differed"}</span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  No suggestion was stored for this ticket.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ol className="space-y-3 text-sm">
                  {ticket.activities.map((activity) => (
                    <li key={activity.id} className="flex gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                      <div>
                        <span className="font-medium">
                          {activity.actor?.name ?? "System"}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {ACTION_LABELS[activity.action] ?? activity.action}
                          {activity.action === "STATUS_CHANGED" &&
                            activity.toValue
                            ? ` to ${activity.toValue.replace("_", " ").toLowerCase()}`
                            : ""}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(activity.createdAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function TicketDetailPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <TicketDetailContent params={params} />
    </Suspense>
  );
}
