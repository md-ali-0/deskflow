export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3 rounded-lg border p-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-9 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-52 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border p-6">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-8 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border p-6">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-8 w-12 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-80 max-w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-44 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-xl border p-6">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-4 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="rounded-xl border p-6">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-4 space-y-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex gap-3">
                  <div className="size-8 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-xl border p-6">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="mt-4 space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
