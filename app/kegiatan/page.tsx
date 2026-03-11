import PageShell from "@/app/components/PageShell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatSubbagName } from "@/lib/formatSubbag";
import Link from "next/link";
import DeleteActivityButton from "./[id]/DeleteActivity";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID").format(n || 0);
}

export default async function KegiatanPage({
  searchParams,
}: {
  searchParams:
    | { tahun?: string; subbagId?: string; q?: string; page?: string }
    | Promise<{ tahun?: string; subbagId?: string; q?: string; page?: string }>;
}) {
  const sp = await Promise.resolve(searchParams);
  const sess = await getSession();
  const tahun = Number(sp.tahun || new Date().getFullYear());
  const isAdmin = sess?.role === "SUPER_ADMIN";
  const subbagId = isAdmin ? sp.subbagId || "" : sess?.subbagId || "";
  const searchQuery = sp.q || "";
  const take = 20;
  const page = Math.max(1, Number(sp.page || 1) || 1);
  const skip = (page - 1) * take;

  const subbags = isAdmin
    ? await prisma.subbag.findMany({ orderBy: { nama: "asc" } })
    : [];

  const where: any = { tahun };
  if (subbagId) where.subbagId = subbagId;
  if (!isAdmin) where.subbagId = sess?.subbagId;

  // Fitur Pencarian
  if (searchQuery) {
    where.OR = [
      { namaKegiatan: { contains: searchQuery } },
      { lokus: { contains: searchQuery } },
    ];
  }

  const totalRows = await prisma.activity.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalRows / take));
  const safePage = Math.min(page, totalPages);
  const safeSkip = (safePage - 1) * take;

  const rows = await prisma.activity.findMany({
    where,
    select: {
      id: true,
      namaKegiatan: true,
      lokus: true,
      realisasiAnggaran: true,
      subbag: { select: { nama: true } },
      budgetAccount: { select: { kodeAkun: true } },
      budgetPlan: { select: { nama: true, totalPagu: true } },
      _count: { select: { documentations: true } },
    },
    skip: safeSkip,
    take,
    orderBy: { createdAt: "desc" },
  });

  // Derive realisasi for rows on this page to keep list consistent with detail page:
  // if BudgetPlan usages exist -> use sum(amountUsed) from ActivityBudgetPlanUsage
  // else if legacy usages exist -> use sum(amountUsed) from ActivityBudgetUsage
  // else -> use Activity.realisasiAnggaran (manual/legacy)
  const realisasiByActivityId = new Map<string, number>();
  if (rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const [planAgg, legacyAgg] = await prisma.$transaction([
      prisma.activityBudgetPlanUsage.groupBy({
        by: ["activityId"],
        where: { activityId: { in: ids } },
        orderBy: { activityId: "asc" },
        _sum: { amountUsed: true },
      }),
      prisma.activityBudgetUsage.groupBy({
        by: ["activityId"],
        where: { activityId: { in: ids } },
        orderBy: { activityId: "asc" },
        _sum: { amountUsed: true },
      }),
    ]);

    const planMap = new Map(planAgg.map((x) => [x.activityId, Number(x._sum?.amountUsed || 0)]));
    const legacyMap = new Map(legacyAgg.map((x) => [x.activityId, Number(x._sum?.amountUsed || 0)]));

    for (const r of rows) {
      if (planMap.has(r.id)) realisasiByActivityId.set(r.id, planMap.get(r.id) || 0);
      else if (legacyMap.has(r.id)) realisasiByActivityId.set(r.id, legacyMap.get(r.id) || 0);
      else realisasiByActivityId.set(r.id, Number((r as any).realisasiAnggaran || 0));
    }
  }

  return (
    <PageShell>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Kegiatan</h1>
        </div>

        <div className="ml-auto">
          <Link
            className="inline-flex items-center gap-2 bg-primary text-white font-bold rounded-lg px-5 py-2.5 transition transform hover:scale-105 hover:shadow-lg active:scale-95"
            href="/kegiatan/new"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Kegiatan
          </Link>
        </div>
      </div>

      <form className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-card p-5 rounded-2xl shadow-sm border border-border" action="/kegiatan" method="get">
        <input type="hidden" name="page" value="1" />
        <div className="lg:col-span-1">
          <label className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block ml-1">Cari Kegiatan / Lokus</label>
          <div className="relative group">
            <input
              name="q"
              defaultValue={searchQuery}
              placeholder="Kata kunci..."
              className="block w-full border border-border rounded-xl pl-11 pr-4 py-2.5 text-base bg-muted/30 focus:bg-background focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none text-foreground"
            />
            <svg className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block ml-1">Tahun</label>
          <input
            name="tahun"
            defaultValue={tahun}
            className="block w-full border border-border rounded-xl px-4 py-2.5 text-base bg-muted/30 focus:bg-background focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-foreground"
          />
        </div>

        {isAdmin && (
          <div className="min-w-0">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block ml-1">Subbagian</label>
            <select
              name="subbagId"
              defaultValue={subbagId}
              className="block w-full border border-border rounded-xl px-4 py-2.5 text-base bg-muted/30 focus:bg-background focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all appearance-none cursor-pointer text-foreground"
            >
              <option value="" className="bg-card text-foreground">Semua Subbag</option>
              {subbags.map((s) => (
                <option key={s.id} value={s.id} className="bg-card text-foreground">
                  {formatSubbagName(s.nama)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-end">
          <button
            className="w-full bg-primary text-white rounded-xl px-6 py-2.5 text-base font-bold hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 min-h-[46px]"
            type="submit"
          >
            Filter
          </button>
        </div>
      </form>

      <div className="mt-8 relative group">
        <div className="absolute -top-6 right-0 text-xs font-medium text-muted-foreground md:hidden animate-pulse">
          &larr; Geser tabel ke kanan untuk detail &rarr;
        </div>
        <div className="overflow-x-auto bg-card rounded-2xl shadow-sm border border-border">
          <table className="min-w-full text-sm md:text-base">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wide text-xs md:text-sm">Nama Kegiatan</th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wide text-xs md:text-sm">Subbag</th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wide text-xs md:text-sm">Lokus</th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wide text-xs md:text-sm">Pagu Kegiatan</th>
                <th className="text-right p-4 font-bold text-muted-foreground uppercase tracking-wide text-xs md:text-sm">Realisasi</th>
                <th className="text-right p-4 font-bold text-muted-foreground uppercase tracking-wide text-xs md:text-sm">%</th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wide text-xs md:text-sm">Akun</th>
                <th className="text-center p-4 font-bold text-muted-foreground uppercase tracking-wide text-xs md:text-sm">Dokumentasi</th>
                <th className="text-center p-4 font-bold text-muted-foreground uppercase tracking-wide text-xs md:text-sm">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const docCount = (r as any)._count?.documentations ?? 0;
 
                const realisasi = Number(realisasiByActivityId.get(r.id) ?? (r as any).realisasiAnggaran ?? 0);
                const totalPagu = Number((r as any).budgetPlan?.totalPagu || 0);
                const totalRealisasi = realisasi;

                const persenValue =
                  totalPagu > 0 ? (totalRealisasi / totalPagu) * 100 : 0;
                const persen = persenValue.toFixed(2);

                const persenClass =
                  persenValue < 50
                    ? "bg-destructive/10 text-destructive border-destructive/20"
                    : persenValue <= 60
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";

                return (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors align-top">
                    <td className="p-4 font-medium text-foreground min-w-[200px]">{r.namaKegiatan}</td>
                    <td className="p-4 text-muted-foreground">{formatSubbagName(r.subbag?.nama)}</td>
                    <td className="p-4 text-muted-foreground">{r.lokus}</td>

                    <td className="p-4 min-w-[150px]">
                      {r.budgetPlan ? (
                        <div className="text-sm leading-snug">
                          <div className="font-semibold text-foreground whitespace-nowrap">Rp {rupiah(totalPagu)}</div>
                          <div className="text-muted-foreground mt-0.5 truncate" title={(r.budgetPlan as any).nama}>
                            {(r.budgetPlan as any).nama}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Belum diatur</span>
                      )}
                    </td>

                    <td className="p-4 text-right font-medium text-foreground whitespace-nowrap">Rp {rupiah(realisasi)}</td>

                    <td className="p-4 text-right">
                      <div className={`inline-flex items-center px-2 py-1 rounded-lg text-sm font-bold border ${persenClass}`}>
                        {persen}%
                      </div>
                    </td>

                    <td className="p-4 min-w-[150px]">
                      {r.budgetPlan ? (
                        <span className="text-muted-foreground">Multi akun</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {(r as any).budgetAccount ? (r as any).budgetAccount.kodeAkun : "-"}
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 text-primary text-sm font-bold border border-primary/20">
                         {docCount} File
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/kegiatan/${r.id}`}
                          prefetch={false}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30"
                          title="Lihat Detail"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </Link>

                        <DeleteActivityButton id={r.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-muted-foreground italic">
                    Data kegiatan tidak ditemukan atau belum ditambahkan.
                  </td>
                </tr>
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
              {Math.min(safeSkip + rows.length, totalRows)}
            </span>
            {" "}dari{" "}
            <span className="font-semibold text-foreground">{totalRows}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              prefetch={false}
              href={{
                pathname: "/kegiatan",
                query: Object.fromEntries(
                  Object.entries({ ...sp, page: String(Math.max(1, safePage - 1)) }).filter(
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
                pathname: "/kegiatan",
                query: Object.fromEntries(
                  Object.entries({ ...sp, page: String(Math.min(totalPages, safePage + 1)) }).filter(
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
