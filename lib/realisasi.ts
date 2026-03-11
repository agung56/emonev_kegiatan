import { prisma } from "@/lib/prisma";

type RealisasiSource = "budgetPlanUsages" | "budgetUsages" | "budgetDetails";

export async function recalcActivityRealisasi(activityId: string): Promise<
  | { updated: false }
  | { updated: true; value: number; source: RealisasiSource }
> {
  const [planAgg, legacyAgg, detailAgg] = await prisma.$transaction([
    prisma.activityBudgetPlanUsage.aggregate({
      where: { activityId },
      _sum: { amountUsed: true },
      _count: { _all: true },
    }),
    prisma.activityBudgetUsage.aggregate({
      where: { activityId },
      _sum: { amountUsed: true },
      _count: { _all: true },
    }),
    prisma.activityBudgetDetail.aggregate({
      where: { activityId },
      _sum: { jumlah: true },
      _count: { _all: true },
    }),
  ]);

  if ((planAgg._count?._all || 0) > 0) {
    const value = Number(planAgg._sum.amountUsed || 0);
    await prisma.activity.update({
      where: { id: activityId },
      data: { realisasiAnggaran: value },
    });
    return { updated: true, value, source: "budgetPlanUsages" };
  }

  if ((legacyAgg._count?._all || 0) > 0) {
    const value = Number(legacyAgg._sum.amountUsed || 0);
    await prisma.activity.update({
      where: { id: activityId },
      data: { realisasiAnggaran: value },
    });
    return { updated: true, value, source: "budgetUsages" };
  }

  if ((detailAgg._count?._all || 0) > 0) {
    const value = Number(detailAgg._sum.jumlah || 0);
    await prisma.activity.update({
      where: { id: activityId },
      data: { realisasiAnggaran: value },
    });
    return { updated: true, value, source: "budgetDetails" };
  }

  // No derived sources present → keep manual value in Activity.realisasiAnggaran
  return { updated: false };
}

