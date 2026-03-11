"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { useTheme } from "@/app/components/ThemeContext";

type ChartData = {
  name: string;
  realisasi: number;
  pagu: number;
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function DashboardCharts({
  data,
  totalPagu,
  totalRealisasi,
}: {
  data: ChartData[];
  totalPagu: number;
  totalRealisasi: number;
}) {
  const { theme } = useTheme();
  const sisaColor = theme === "dark" ? "#1e293b" : "#e2e8f0";

  const pieData = [
    { name: "Realisasi", value: totalRealisasi, color: "#10b981" },
    { name: "Sisa", value: Math.max(0, totalPagu - totalRealisasi), color: sisaColor },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* BAR CHART: REALISASI PER SUBBAG */}
      <div className="lg:col-span-2 bg-card p-6 rounded-2xl shadow-sm border border-border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-foreground/80 text-sm uppercase tracking-wider">
            Realisasi Anggaran per Subbag
          </h3>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                tickFormatter={(value) => `Rp ${new Intl.NumberFormat("id-ID", { notation: "compact" }).format(value)}`}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value) => {
                  if (typeof value !== "number") return ["0", "Realisasi"];
                  return [
                    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value),
                    "Realisasi",
                  ];
                }}
              />
              <Bar dataKey="realisasi" radius={[4, 4, 0, 0]} barSize={40}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PIE CHART: PENYERAPAN GLOBAL */}
      <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
        <h3 className="font-bold text-foreground/80 text-sm uppercase tracking-wider mb-6">
          Penyerapan Total
        </h3>
        <div className="h-[240px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                formatter={(value) => {
              if (typeof value !== "number") return ["0", ""];
              return [`Rp ${new Intl.NumberFormat("id-ID").format(value)}`, ""];
            }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-foreground">
              {totalPagu > 0 ? Math.round((totalRealisasi / totalPagu) * 100) : 0}%
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter mt-[-4px]">Tercapai</span>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {pieData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.name}</span>
              </div>
              <span className="font-bold">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0, notation: "compact" }).format(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
