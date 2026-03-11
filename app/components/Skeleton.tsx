import React from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-card p-5 rounded-2xl shadow-sm border border-border space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-full max-w-[150px]" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-4">
      <div className="flex gap-4 mb-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 flex-1 rounded-lg" />
        ))}
      </div>
      <div className="border border-border rounded-2xl overflow-hidden bg-card">
        <div className="p-4 border-b border-border bg-muted/30">
          <Skeleton className="h-4 w-1/3" />
        </div>
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="p-4 border-b border-border last:border-0 flex gap-4 items-center">
            <Skeleton className="h-5 w-[200px]" />
            <Skeleton className="h-5 w-[100px]" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-5 w-[80px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
