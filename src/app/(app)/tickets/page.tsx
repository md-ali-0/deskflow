import Link from "next/link";
import { Suspense } from "react";
import { NewTicketDialog } from "@/components/new-ticket-dialog";
import { PageSkeleton } from "@/components/page-skeleton";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { TicketFilters } from "@/components/ticket-filters";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dueLabel, shortNumber } from "@/lib/format";
import { listTicketsQuerySchema } from "@/lib/validation/ticket";
import { prisma } from "@/lib/db";
import { listTickets } from "@/services/ticket.service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function TicketsContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;

  const parsed = listTicketsQuerySchema.safeParse({
    status: first(raw.status),
    priority: first(raw.priority),
    q: first(raw.q),
  });
  const filters = parsed.success ? parsed.data : {};

  const [tickets, categories] = await Promise.all([
    listTickets(filters),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
          <p className="text-sm text-muted-foreground">
            {tickets.length} ticket{tickets.length === 1 ? "" : "s"} — open work
            first, nearest deadline at the top.
          </p>
        </div>
        <NewTicketDialog categories={categories} />
      </div>

      <Suspense fallback={null}>
        <TicketFilters />
      </Suspense>

      {tickets.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No tickets match these filters</EmptyTitle>
            <EmptyDescription>
              Clear the search or pick a different status to see more.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" render={<Link href="/tickets" />}>
              Reset filters
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">No.</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-28">Priority</TableHead>
                <TableHead className="w-40">Assignee</TableHead>
                <TableHead className="w-32">SLA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => {
                const due = dueLabel(ticket.dueAt, ticket.status);
                return (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="hover:underline"
                      >
                        {shortNumber(ticket.number)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="font-medium hover:underline"
                      >
                        {ticket.subject}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {ticket.category.name}
                        {ticket._count.comments > 0
                          ? ` · ${ticket._count.comments} comment${ticket._count.comments === 1 ? "" : "s"
                          }`
                          : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ticket.assignedTo?.name ?? "Unassigned"}
                    </TableCell>
                    <TableCell
                      className={
                        due.overdue
                          ? "text-sm font-medium text-destructive"
                          : "text-sm text-muted-foreground"
                      }
                    >
                      {due.text}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function TicketsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TicketsContent searchParams={searchParams} />
    </Suspense>
  );
}
