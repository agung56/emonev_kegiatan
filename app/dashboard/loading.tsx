import PageShell from "@/app/components/PageShell";
import { Skeleton, SkeletonCard, SkeletonTable } from "@/app/components/Skeleton";

export default function DashboardLoading() {
  return (
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8 italic text-muted-foreground animate-pulse">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="w-24 h-10 rounded-xl" />
          <Skeleton className="w-44 h-10 rounded-xl" />
          <Skeleton className="w-20 h-10 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Skeleton className="lg:col-span-2 h-[380px] rounded-2xl" />
        <Skeleton className="h-[380px] rounded-2xl" />
      </div>

      <SkeletonTable rows={8} />
    </PageShell>
  );
}
