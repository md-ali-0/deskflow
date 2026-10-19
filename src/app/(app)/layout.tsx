import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { getSession } from "@/lib/auth";

async function Header() {
  await connection();

  const user = await getSession();
  if (!user) redirect("/login");

  return <AppHeader name={user.name} role={user.role} />;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <Suspense fallback={<div className="h-14 border-b bg-background" />}>
        <Header />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </main>
    </div>
  );
}
