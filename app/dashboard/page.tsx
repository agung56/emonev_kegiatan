import PageShell from "@/app/components/PageShell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatSubbagName } from "@/lib/formatSubbag";
import Link from "next/link";
import DashboardChartsLazy from "./DashboardChartsLazy";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { tahun?: string; subbagId?: string; page?: string };
}) {
  const sess = await getSession();
  const tahun = Number(searchParams.tahun || new Date().getFullYear());
  const isAdmin = sess?.role === "SUPER_ADMIN";
  const subbagId = isAdmin ? (searchParams.subbagId || "") : (sess?.subbagId || "");
  const take = 10;
  const page = Math.max(1, Number(searchParams.page || 1) || 1);

  const subbags = isAdmin
    ? await prisma.subbag.findMany({
        orderBy: { nama: "asc" },
        select: { id: true, nama: true },
      })
    : [];
  const where: any = { tahun };
  if (subbagId) where.subbagId = subbagId;

  // Realisasi yang ditampilkan harus mengikuti data usage terbaru.
  // (Ada kasus activity.realisasiAnggaran belum sinkron dengan usage.)
  const baseActivities = await prisma.activity.findMany({
    where,
    select: { id: true, subbagId: true, realisasiAnggaran: true },
  });
  const totalRows = baseActivities.length;

  const activityIds = baseActivities.map((a) => a.id);
  const [planSums, legacySums] =
    activityIds.length > 0
      ? await Promise.all([
          prisma.activityBudgetPlanUsage.groupBy({
            by: ["activityId"],
            where: { activityId: { in: activityIds } },
            _sum: { amountUsed: true },
          }),
          prisma.activityBudgetUsage.groupBy({
            by: ["activityId"],
            where: { activityId: { in: activityIds } },
            _sum: { amountUsed: true },
          }),
        ])
      : [[], []];

  const planMap = new Map<string, number>(
    (planSums as any[]).map((s) => [s.activityId, Number(s._sum?.amountUsed || 0)])
  );
  const legacyMap = new Map<string, number>(
    (legacySums as any[]).map((s) => [s.activityId, Number(s._sum?.amountUsed || 0)])
  );

  const realisasiByActivityId = new Map<string, number>();
  const groupedBySubbagMap = new Map<string, number>();
  let totalRealisasi = 0;

  for (const a of baseActivities) {
    const hasUsage = planMap.has(a.id) || legacyMap.has(a.id);
    const usageTotal = (planMap.get(a.id) || 0) + (legacyMap.get(a.id) || 0);
    const realisasi = hasUsage ? usageTotal : Number(a.realisasiAnggaran || 0);

    realisasiByActivityId.set(a.id, realisasi);
    totalRealisasi += realisasi;
    groupedBySubbagMap.set(a.subbagId, (groupedBySubbagMap.get(a.subbagId) || 0) + realisasi);
  }
  
  // Hitung total pagu dari BudgetPlan (Pagu Global) untuk tahun yg dipilih
  const budgets = await prisma.budgetPlan.findMany({
    where: { tahun },
    select: { totalPagu: true },
  });
  const totalPagu = budgets.reduce((s, b) => s + (b.totalPagu || 0), 0);
  const sisaAnggaran = Math.max(0, totalPagu - totalRealisasi);
  const persenRealisasi = totalPagu > 0 ? (totalRealisasi / totalPagu) * 100 : 0;

  // Persiapkan data untuk chart (agregasi per subbag)
  const chartDataMap = new Map<string, { name: string; realisasi: number; pagu: number }>();
  
  // Inisialisasi dari subbags atau dari aktifitas yang ada
  const targetSubbags = isAdmin ? subbags : [];
  if (targetSubbags.length === 0 && subbagId) {
     // If user is not admin and has a subbagId, but it's not in subbags (unlikely)
     const sb = await prisma.subbag.findUnique({
       where: { id: subbagId },
       select: { id: true, nama: true },
     });
     if (sb) targetSubbags.push(sb);
  }

  targetSubbags.forEach(s => {
    chartDataMap.set(s.id, { name: formatSubbagName(s.nama), realisasi: 0, pagu: 0 });
  });

  groupedBySubbagMap.forEach((sum, sbId) => {
    const fallbackName =
      formatSubbagName(targetSubbags.find((s) => s.id === sbId)?.nama || "Subbag");
    const entry = chartDataMap.get(sbId) || { name: fallbackName, realisasi: 0, pagu: 0 };
    entry.realisasi += Number(sum || 0);
    chartDataMap.set(sbId, entry);
  });

  const chartData = Array.from(chartDataMap.values());

  const totalPages = Math.max(1, Math.ceil(totalRows / take));
  const safePage = Math.min(page, totalPages);
  const safeSkip = (safePage - 1) * take;

  const activities = await prisma.activity.findMany({
    where,
    select: {
      id: true,
      namaKegiatan: true,
      lokus: true,
      outputKegiatan: true,
      kendala: true,
      realisasiAnggaran: true,
      subbag: { select: { nama: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: safeSkip,
    take,
  });
 
  return (
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Rekap</h1>
          <p className="text-sm text-muted-foreground mt-1">Pantau performa anggaran dan kegiatan secara real-time.</p>
        </div>

        <form className="flex flex-wrap gap-3 items-end bg-card p-3 rounded-xl border border-border shadow-sm" action="/dashboard" method="get">
          <input type="hidden" name="page" value="1" />
          <div className="w-24">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block ml-1">Tahun</label>
            <input 
              name="tahun" 
              defaultValue={tahun} 
              className="block w-full border border-input rounded-lg px-2.5 py-1.5 text-xs bg-muted/50 focus:bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
            />
          </div>
          {isAdmin && (
            <div className="w-44">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block ml-1">Subbagian</label>
              <select 
                name="subbagId" 
                defaultValue={subbagId} 
                className="block w-full border border-input rounded-lg px-2.5 py-1.5 text-xs bg-muted/50 focus:bg-background focus:ring-2 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Semua Subbag</option>
                {subbags.map((s) => (
                  <option key={s.id} value={s.id}>{formatSubbagName(s.nama)}</option>
                ))}
              </select>
            </div>
          )}
          <button className="bg-primary text-primary-foreground font-bold rounded-lg px-4 py-1.5 text-xs hover:opacity-90 transition-all h-[34px]" type="submit">Filter</button>
        </form>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card p-5 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Pagu</div>
          </div>
          <div className="text-xl font-bold text-foreground">Rp {rupiah(totalPagu)}</div>
        </div>

        <div className="bg-card p-5 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Realisasi</div>
          </div>
          <div className="text-xl font-bold text-foreground">Rp {rupiah(totalRealisasi)}</div>
          <div className="mt-2 text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full inline-block">{persenRealisasi.toFixed(1)}% Tercapai</div>
        </div>

        <div className="bg-card p-5 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sisa Anggaran</div>
          </div>
          <div className="text-xl font-bold text-foreground">Rp {rupiah(sisaAnggaran)}</div>
        </div>

        <div className="bg-card p-5 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Kegiatan</div>
          </div>
          <div className="text-xl font-bold text-foreground">{totalRows} Kegiatan</div>
        </div>
      </div>

      {/* DASHBOARD CHARTS */}
      <DashboardChartsLazy data={chartData} totalPagu={totalPagu} totalRealisasi={totalRealisasi} />
 
      <div className="relative group">
        <div className="absolute -top-6 right-0 text-[10px] text-muted-foreground md:hidden animate-pulse">
          &larr; Geser tabel untuk detail &rarr;
        </div>
        <div className="overflow-x-auto bg-card rounded-2xl shadow-sm border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Kegiatan</th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Subbag</th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Lokus</th>
                <th className="text-right p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Realisasi</th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Output</th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Kendala</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {activities.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium text-foreground min-w-[200px]">{a.namaKegiatan}</td>
                  <td className="p-4 text-muted-foreground">{formatSubbagName(a.subbag.nama)}</td>
                  <td className="p-4 text-muted-foreground">{a.lokus}</td>
                  <td className="p-4 text-right font-medium text-foreground whitespace-nowrap">Rp {rupiah(realisasiByActivityId.get(a.id) ?? a.realisasiAnggaran)}</td>
                  <td className="p-4 max-w-xs truncate text-muted-foreground" title={a.outputKegiatan}>{a.outputKegiatan}</td>
                  <td className="p-4 max-w-xs truncate text-muted-foreground italic" title={a.kendala}>{a.kendala || "-"}</td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr><td className="p-12 text-center text-muted-foreground italic" colSpan={6}>Belum ada data untuk periode ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 mt-4">
          <div className="text-sm text-muted-foreground">
            Menampilkan{" "}
            <span className="font-semibold text-foreground">
              {totalRows === 0 ? 0 : safeSkip + 1}
            </span>
            {" - "}
            <span className="font-semibold text-foreground">
              {Math.min(safeSkip + activities.length, totalRows)}
            </span>
            {" "}dari{" "}
            <span className="font-semibold text-foreground">{totalRows}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              prefetch={false}
              href={{
                pathname: "/dashboard",
                query: Object.fromEntries(
                  Object.entries({ ...searchParams, page: String(Math.max(1, safePage - 1)) }).filter(
                    ([, v]) => v !== undefined && v !== ""
                  )
                ),
              }}
              aria-disabled={safePage <= 1}
              className={`px-3 py-2 rounded-xl border border-border font-bold transition-all text-sm ${
                safePage <= 1
                  ? "opacity-50 pointer-events-none text-muted-foreground"
                  : "hover:bg-muted/30 text-foreground"
              }`}
            >
              Sebelumnya
            </Link>

            <div className="px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm font-bold text-foreground">
              {safePage} / {totalPages}
            </div>

            <Link
              prefetch={false}
              href={{
                pathname: "/dashboard",
                query: Object.fromEntries(
                  Object.entries({ ...searchParams, page: String(Math.min(totalPages, safePage + 1)) }).filter(
                    ([, v]) => v !== undefined && v !== ""
                  )
                ),
              }}
              aria-disabled={safePage >= totalPages}
              className={`px-3 py-2 rounded-xl border border-border font-bold transition-all text-sm ${
                safePage >= totalPages
                  ? "opacity-50 pointer-events-none text-muted-foreground"
                  : "hover:bg-muted/30 text-foreground"
              }`}
            >
              Berikutnya
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
