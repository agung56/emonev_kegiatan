import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow } from "@/lib/auth";

function monthOf(d: Date) {
  return d.getMonth() + 1;
}

function toNumberMaybe(v: string) {
  const s = String(v ?? "").replace(/[^0-9.,-]/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function percent(sumCapaian: number, sumTarget: number) {
  if (!sumTarget || sumTarget <= 0) return 0;
  return (sumCapaian / sumTarget) * 100;
}

function getActivityDate(act: any) {
  if (act.tanggalMulai) return new Date(act.tanggalMulai);
  if (act.tanggalSelesai) return new Date(act.tanggalSelesai);
  return new Date(act.createdAt);
}

export async function GET(req: Request) {
  const user = await getActiveUserOrThrow();
  const { searchParams } = new URL(req.url);

  const tahun = Number(searchParams.get("tahun") || new Date().getFullYear());
  const mode = (searchParams.get("mode") || "monthly") as
    | "monthly"
    | "triwulan"
    | "year";
  const bulan = Number(searchParams.get("bulan") || new Date().getMonth() + 1);
  const triwulan = Number(searchParams.get("triwulan") || 1);

  const subbagId =
    user.role === "SUPER_ADMIN"
      ? searchParams.get("subbagId") || ""
      : user.subbagId || "";

  const where: any = { tahun };
  if (subbagId) where.subbagId = subbagId;

  const activities = await prisma.activity.findMany({
    where,
    include: {
      subbag: true,
      budgetAccount: true,
      indicators: {
        include: {
          indicator: true,
        },
      },

      // legacy
      budgetUsages: {
        include: {
          budgetAllocation: {
            include: {
              budgetAccount: true,
            },
          },
        },
      },

      // sistem baru
      budgetPlan: {
        include: {
          details: true,
        },
      },
      budgetPlanUsages: {
        include: {
          budgetPlanDetail: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Ambil semua detail akun pada budget plan yang muncul di hasil query
  const allPlanDetailIds = Array.from(
    new Set(
      activities.flatMap((act: any) =>
        ((act.budgetPlan?.details || []) as any[]).map((d: any) => d.id)
      )
    )
  );

  // Hitung total pemakaian global per budgetPlanDetailId
  const globalPlanUsageAgg =
    allPlanDetailIds.length > 0
      ? await prisma.activityBudgetPlanUsage.groupBy({
          by: ["budgetPlanDetailId"],
          where: {
            budgetPlanDetailId: { in: allPlanDetailIds },
          },
          _sum: {
            amountUsed: true,
          },
        })
      : [];

  const globalPlanUsageMap = new Map<string, number>();
  for (const row of globalPlanUsageAgg) {
    globalPlanUsageMap.set(row.budgetPlanDetailId, row._sum.amountUsed ?? 0);
  }

  const buckets: Record<string, any> = {};

  function bucketKey(m: number) {
    if (mode === "monthly") return String(m);
    if (mode === "triwulan") {
      if (m >= 1 && m <= 3) return "1";
      if (m >= 4 && m <= 6) return "2";
      if (m >= 7 && m <= 9) return "3";
      return "4";
    }
    return "1";
  }

  for (const act of activities) {
    const activityDate = getActivityDate(act);
    const m = monthOf(activityDate);

    if (mode === "monthly" && m !== bulan) continue;

    if (mode === "triwulan") {
      const q =
        m >= 1 && m <= 3 ? 1 : m >= 4 && m <= 6 ? 2 : m >= 7 && m <= 9 ? 3 : 4;

      if (q !== triwulan) continue;
    }

    const p = bucketKey(m);

    if (!buckets[p]) {
      buckets[p] = { period: Number(p), indicators: {} };
    }

    const targetNum = toNumberMaybe(act.targetKinerja);
    const capaianNum = toNumberMaybe(act.capaianKinerja);

    for (const link of act.indicators) {
      const ind = link.indicator;
      const indId = ind.id;

      if (!buckets[p].indicators[indId]) {
        buckets[p].indicators[indId] = {
          id: ind.id,
          nama: ind.nama,
          formulaPerhitungan: (ind as any).formulaPerhitungan || null,
          sumberData: (ind as any).sumberData || null,
          sumTarget: 0,
          sumCapaian: 0,
          totalRealisasi: 0,
          totalPagu: 0,
          totalSisa: 0,
          accounts: {} as Record<string, any>,
          activities: [] as any[],
        };
      }

      const slot = buckets[p].indicators[indId];

      if (targetNum !== null && capaianNum !== null) {
        slot.sumTarget += targetNum;
        slot.sumCapaian += capaianNum;
      }

      slot.totalRealisasi += Number(act.realisasiAnggaran || 0);

      const planUsages = (act as any).budgetPlanUsages || [];
      const planDetails = (act as any).budgetPlan?.details || [];
      const legacyUsages = (act as any).budgetUsages || [];

      // SISTEM BARU: budgetPlan + budgetPlanUsages
      if (planDetails.length > 0) {
        for (const detail of planDetails) {
          const detailId = detail.id;
          const pagu = Number(detail.pagu || 0);
          const realisasiGlobal = Number(globalPlanUsageMap.get(detailId) || 0);
          const sisaGlobal = pagu - realisasiGlobal;

          if (!slot.accounts[detailId]) {
            slot.accounts[detailId] = {
              budgetAccountId: detailId,
              namaAkun: detail.akun || "-",
              pagu,
              realisasi: realisasiGlobal,
              sisa: sisaGlobal,
            };
          } else {
            slot.accounts[detailId].pagu = pagu;
            slot.accounts[detailId].realisasi = realisasiGlobal;
            slot.accounts[detailId].sisa = sisaGlobal;
          }
        }
      }
      // SISTEM LAMA
      else if (legacyUsages.length > 0) {
        for (const u of legacyUsages) {
          const baId = u?.budgetAllocation?.budgetAccountId;
          if (!baId) continue;

          if (!slot.accounts[baId]) {
            slot.accounts[baId] = {
              budgetAccountId: baId,
              namaAkun:
                u.budgetAllocation?.budgetAccount?.namaAkun ||
                u.budgetAllocation?.budgetAccount?.kodeAkun ||
                "-",
              pagu: Number(u.budgetAllocation?.pagu || 0),
              realisasi: 0,
              sisa: 0,
            };
          }

          slot.accounts[baId].realisasi += Number(u.amountUsed || 0);
          slot.accounts[baId].sisa =
            Number(slot.accounts[baId].pagu || 0) -
            Number(slot.accounts[baId].realisasi || 0);
        }
      } else if (act.budgetAccountId) {
        const baId = act.budgetAccountId;

        if (!slot.accounts[baId]) {
          slot.accounts[baId] = {
            budgetAccountId: baId,
            namaAkun:
              act.budgetAccount?.namaAkun ||
              act.budgetAccount?.kodeAkun ||
              "-",
            pagu: 0,
            realisasi: 0,
            sisa: 0,
          };
        }

        slot.accounts[baId].realisasi += Number(act.realisasiAnggaran || 0);
        slot.accounts[baId].sisa =
          Number(slot.accounts[baId].pagu || 0) -
          Number(slot.accounts[baId].realisasi || 0);
      }

      slot.activities.push({
        id: act.id,
        namaKegiatan: act.namaKegiatan,
        lokus: act.lokus,
        akunAnggaran:
          planUsages.length > 0
            ? planUsages
                .map((u: any) => u?.budgetPlanDetail?.akun)
                .filter(Boolean)
                .join(", ")
            : planDetails.length > 0
            ? planDetails.map((d: any) => d.akun).filter(Boolean).join(", ")
            : legacyUsages.length > 0
            ? legacyUsages
                .map(
                  (u: any) =>
                    u?.budgetAllocation?.budgetAccount?.kodeAkun ||
                    u?.budgetAllocation?.budgetAccount?.namaAkun
                )
                .filter(Boolean)
                .join(", ")
            : act.budgetAccount?.namaAkun || act.budgetAccount?.kodeAkun || "-",
        realisasiAnggaran: Number(act.realisasiAnggaran || 0),
        targetKinerja: act.targetKinerja,
        capaianKinerja: act.capaianKinerja,
        tanggalMulai: act.tanggalMulai,
        tanggalSelesai: act.tanggalSelesai,
        createdAt: act.createdAt,
      });
    }
  }

  let periods = Object.values(buckets)
    .map((b: any) => {
      const indicators = Object.values(b.indicators).map((i: any) => {
        const accountsArr = Object.values(i.accounts || {}).map((a: any) => {
          a.sisa = Number(a.pagu || 0) - Number(a.realisasi || 0);
          return a;
        });

        accountsArr.sort((x: any, y: any) =>
          String(x.namaAkun).localeCompare(String(y.namaAkun))
        );

        const totalPagu = accountsArr.reduce(
          (s: number, a: any) => s + Number(a.pagu || 0),
          0
        );

        const totalSisa = accountsArr.reduce(
          (s: number, a: any) =>
            s + (Number(a.pagu || 0) - Number(a.realisasi || 0)),
          0
        );

        return {
          ...i,
          accounts: accountsArr,
          totalPagu,
          totalSisa,
          capaianKinerjaPersen: percent(i.sumCapaian, i.sumTarget),
        };
      });

      indicators.sort((a: any, b: any) =>
        String(a.nama).localeCompare(String(b.nama))
      );

      return { period: b.period, indicators };
    })
    .sort((a: any, b: any) => a.period - b.period);

  if (mode === "monthly") {
    periods = periods.filter((p: any) => p.period === bulan);
  }

  if (mode === "triwulan") {
    periods = periods.filter((p: any) => p.period === triwulan);
  }

  return NextResponse.json({
    ok: true,
    tahun,
    mode,
    bulan: mode === "monthly" ? bulan : null,
    triwulan: mode === "triwulan" ? triwulan : null,
    subbagId: subbagId || null,
    periods,
  });
}