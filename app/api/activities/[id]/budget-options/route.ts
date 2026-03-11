import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const params = await ctx.params;
  const user = await getActiveUserOrThrow();

  const act = await prisma.activity.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      tahun: true,
      subbagId: true,
    },
  });

  if (!act) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.role !== "SUPER_ADMIN" && act.subbagId !== user.subbagId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allocations = await prisma.budgetAllocation.findMany({
    where: {
      tahun: act.tahun,
      subbagId: act.subbagId,
    },
    include: {
      budgetAccount: true,
    },
    orderBy: [{ budgetAccount: { kodeAkun: "asc" } }],
  });

  const allocationIds = allocations.map((a) => a.id);

  const usedAgg = await prisma.activityBudgetUsage.groupBy({
    by: ["budgetAllocationId"],
    where: {
      budgetAllocationId: { in: allocationIds },
    },
    _sum: {
      amountUsed: true,
    },
  });

  const usedByThisActivityAgg = await prisma.activityBudgetUsage.groupBy({
    by: ["budgetAllocationId"],
    where: {
      budgetAllocationId: { in: allocationIds },
      activityId: act.id,
    },
    _sum: {
      amountUsed: true,
    },
  });

  const usedMap = new Map<string, number>();
  for (const row of usedAgg) {
    usedMap.set(row.budgetAllocationId, row._sum.amountUsed ?? 0);
  }

  const usedByThisActivityMap = new Map<string, number>();
  for (const row of usedByThisActivityAgg) {
    usedByThisActivityMap.set(row.budgetAllocationId, row._sum.amountUsed ?? 0);
  }

  const items = allocations.map((a) => {
    const used = usedMap.get(a.id) ?? 0;
    const usedByThisActivity = usedByThisActivityMap.get(a.id) ?? 0;
    const remaining = (a.pagu ?? 0) - used + usedByThisActivity;

    return {
      id: a.id,
      pagu: a.pagu,
      used,
      usedByThisActivity,
      remaining,
      budgetAccount: a.budgetAccount,
    };
  });

  return NextResponse.json({ ok: true, items });
}
