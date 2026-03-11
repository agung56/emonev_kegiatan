import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow } from "@/lib/auth";
import { z } from "zod";

async function assertCanAccessActivity(activityId: string) {
  const user = await getActiveUserOrThrow();

  const act = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      subbagId: true,
      budgetPlanId: true,
    },
  });

  if (!act) return { act: null as any, user };

  if (user.role !== "SUPER_ADMIN" && act.subbagId !== user.subbagId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { act, user };
}

async function recalcActivityUsed(activityId: string) {
  const agg = await prisma.activityBudgetPlanUsage.aggregate({
    where: { activityId },
    _sum: { amountUsed: true },
  });

  await prisma.activity.update({
    where: { id: activityId },
    data: {
      realisasiAnggaran: agg._sum.amountUsed ?? 0,
    },
  });
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const params = await ctx.params;
  const access = await assertCanAccessActivity(params.id);
  if (access instanceof NextResponse) return access;
  if (!access.act) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = await prisma.activityBudgetPlanUsage.findMany({
    where: { activityId: params.id },
    include: {
      budgetPlanDetail: true,
      evidences: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ ok: true, items });
}

const Schema = z.object({
  budgetPlanDetailId: z.string().min(1),
  amountUsed: z.coerce.number().int().min(0),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const params = await ctx.params;
  const access = await assertCanAccessActivity(params.id);
  if (access instanceof NextResponse) return access;
  if (!access.act) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const detail = await prisma.budgetPlanDetail.findUnique({
    where: { id: parsed.data.budgetPlanDetailId },
  });

  if (!detail) {
    return NextResponse.json(
      { ok: false, error: "Detail pagu tidak ditemukan" },
      { status: 404 }
    );
  }

  if (access.act.budgetPlanId !== detail.budgetPlanId) {
    return NextResponse.json(
      { ok: false, error: "Detail pagu tidak sesuai dengan kegiatan ini" },
      { status: 400 }
    );
  }

  if (parsed.data.amountUsed === 0) {
    await prisma.activityBudgetPlanUsage.deleteMany({
      where: {
        activityId: params.id,
        budgetPlanDetailId: parsed.data.budgetPlanDetailId,
      },
    });

    await recalcActivityUsed(params.id);
    return NextResponse.json({ ok: true, deleted: true });
  }

  const item = await prisma.activityBudgetPlanUsage.upsert({
    where: {
      activityId_budgetPlanDetailId: {
        activityId: params.id,
        budgetPlanDetailId: parsed.data.budgetPlanDetailId,
      },
    },
    create: {
      activityId: params.id,
      budgetPlanDetailId: parsed.data.budgetPlanDetailId,
      amountUsed: parsed.data.amountUsed,
    },
    update: {
      amountUsed: parsed.data.amountUsed,
    },
    include: {
      budgetPlanDetail: true,
      evidences: true,
    },
  });

  await recalcActivityUsed(params.id);

  return NextResponse.json({ ok: true, item });
}
