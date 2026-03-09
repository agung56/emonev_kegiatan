import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow } from "@/lib/auth";
import { z } from "zod";

async function assertCanAccessActivity(activityId: string) {
  const user = await getActiveUserOrThrow();

  const act = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      tahun: true,
      subbagId: true,
      budgetAccountId: true,
    },
  });

  if (!act) return { act: null as any, user };

  if (user.role !== "SUPER_ADMIN" && act.subbagId !== user.subbagId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { act, user };
}

async function recalcActivityUsed(activityId: string) {
  const agg = await prisma.activityBudgetUsage.aggregate({
    where: { activityId },
    _sum: { amountUsed: true },
  });

  await prisma.activity.update({
    where: { id: activityId },
    data: { realisasiAnggaran: agg._sum.amountUsed ?? 0 },
  });
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const access = await assertCanAccessActivity(params.id);
  if (access instanceof NextResponse) return access;
  if (!access.act) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = await prisma.activityBudgetUsage.findMany({
    where: { activityId: params.id },
    include: {
      budgetAllocation: {
        include: {
          budgetAccount: true,
          subbag: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ ok: true, items });
}

const CreateSchema = z.object({
  budgetAllocationId: z.string().min(1),
  amountUsed: z.coerce.number().int().min(0),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const access = await assertCanAccessActivity(params.id);
  if (access instanceof NextResponse) return access;
  if (!access.act) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const alloc = await prisma.budgetAllocation.findUnique({
    where: { id: parsed.data.budgetAllocationId },
    include: { budgetAccount: true },
  });

  if (!alloc) {
    return NextResponse.json(
      { ok: false, error: "Alokasi tidak ditemukan" },
      { status: 404 }
    );
  }

  if (
    alloc.tahun !== access.act.tahun ||
    alloc.subbagId !== access.act.subbagId
  ) {
    return NextResponse.json(
      { ok: false, error: "Alokasi tidak sesuai tahun/subbag kegiatan" },
      { status: 400 }
    );
  }

  if (parsed.data.amountUsed === 0) {
    await prisma.activityBudgetUsage.deleteMany({
      where: {
        activityId: params.id,
        budgetAllocationId: parsed.data.budgetAllocationId,
      },
    });

    await recalcActivityUsed(params.id);

    return NextResponse.json({ ok: true, deleted: true });
  }

  const item = await prisma.activityBudgetUsage.upsert({
    where: {
      activityId_budgetAllocationId: {
        activityId: params.id,
        budgetAllocationId: parsed.data.budgetAllocationId,
      },
    },
    create: {
      activityId: params.id,
      budgetAllocationId: parsed.data.budgetAllocationId,
      amountUsed: parsed.data.amountUsed,
    },
    update: {
      amountUsed: parsed.data.amountUsed,
    },
    include: {
      budgetAllocation: {
        include: {
          budgetAccount: true,
          subbag: true,
        },
      },
    },
  });

  if (!access.act.budgetAccountId) {
    await prisma.activity.update({
      where: { id: params.id },
      data: { budgetAccountId: alloc.budgetAccountId },
    });
  }

  await recalcActivityUsed(params.id);

  return NextResponse.json({ ok: true, item });
}