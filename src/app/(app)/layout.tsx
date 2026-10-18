import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { getSession } from "@/lib/auth";

async function Shell({ children }: { children: ReactNode }) {
  await connection();

  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader name={user.name} role={user.role} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-svh bg-muted/30" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
