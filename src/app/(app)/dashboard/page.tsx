import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/page-skeleton";
import { getDashboardCounts } from "@/services/ticket.service";

async function DashboardContent() {
  await connection();

  const counts = await getDashboardCounts();

  const cards = [
    { label: "Open", value: counts.open, href: "/tickets?status=OPEN" },
    {
      label: "In progress",
      value: counts.inProgress,
      href: "/tickets?status=IN_PROGRESS",
    },
    {
      label: "Resolved",
      value: counts.resolved,
      href: "/tickets?status=RESOLVED",
    },
    { label: "Closed", value: counts.closed, href: "/tickets?status=CLOSED" },
  ];

  const total = cards.reduce((sum, card) => sum + card.value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {total} ticket{total === 1 ? "" : "s"} in the system.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">
                  {card.value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className={counts.overdue > 0 ? "border-destructive/40" : ""}>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            SLA breaches
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div
            className={
              counts.overdue > 0
                ? "text-3xl font-semibold tracking-tight text-destructive"
                : "text-3xl font-semibold tracking-tight"
            }
          >
            {counts.overdue}
          </div>
          <p className="text-sm text-muted-foreground">
            {counts.overdue > 0
              ? "Tickets past their deadline and still open. Sorted first on the ticket list."
              : "Nothing is past its deadline right now."}
          </p>
          {counts.overdue > 0 && (
            <Link
              href="/tickets"
              className="text-sm font-medium text-primary hover:underline"
            >
              Review them →
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
