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

function wrapLabel(value: unknown, maxCharsPerLine: number) {
  const text = String(value ?? "").trim();
  if (!text) return [];

  const words = text.split(/\s+/g);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function XAxisTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: unknown };
}) {
  const value = payload?.value ?? "";
  const lines = wrapLabel(value, 16);

  // Up to 4 lines to avoid clipping; still shows full text (no ellipsis).
  const safeLines = lines.length > 4 ? lines.slice(0, 3).concat([lines.slice(3).join(" ")]) : lines;

  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text
        fill="hsl(var(--muted-foreground))"
        fontSize={10}
        textAnchor="middle"
        dominantBaseline="hanging"
      >
        {safeLines.map((line, i) => (
          <tspan key={i} x={0} dy={i === 0 ? 0 : 13}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

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
  const n = Math.max(1, data.length);

  // Make bars fill the available width better (especially when only a few categories exist).
  // Tuned to keep bars from looking oversized in the card.
  const barCategoryGap = n <= 3 ? "50%" : "26%";
  const maxBarSize = n === 1 ? 84 : n === 2 ? 76 : n === 3 ? 68 : 60;

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
        <div className="h-[300px] md:h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              barCategoryGap={barCategoryGap}
              barGap={14}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={<XAxisTick />}
                dy={10}
                interval={0}
                height={120}
                padding={{ left: 0, right: 0 }}
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
              <Bar dataKey="realisasi" radius={[6, 6, 0, 0]} maxBarSize={maxBarSize}>
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
        <div className="h-[240px] md:h-[260px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius="60%"
                outerRadius="70%"
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
