"use client";

import dynamic from "next/dynamic";

type DashboardChartsProps = {
  data: { name: string; realisasi: number; pagu: number }[];
  totalPagu: number;
  totalRealisasi: number;
};

const DashboardCharts = dynamic(() => import("./DashboardCharts"), {
  ssr: false,
  loading: () => <DashboardChartsSkeleton />,
});

function DashboardChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div className="lg:col-span-2 bg-card p-6 rounded-2xl shadow-sm border border-border">
        <div className="h-4 w-64 bg-muted rounded mb-6" />
        <div className="h-[300px] w-full bg-muted/50 rounded-xl animate-pulse" />
      </div>
      <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
        <div className="h-4 w-40 bg-muted rounded mb-6" />
        <div className="h-[240px] w-full bg-muted/50 rounded-xl animate-pulse" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full bg-muted/50 rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-muted/50 rounded animate-pulse" />
          <div className="h-3 w-4/6 bg-muted/50 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardChartsLazy(props: DashboardChartsProps) {
  return <DashboardCharts {...props} />;
}

