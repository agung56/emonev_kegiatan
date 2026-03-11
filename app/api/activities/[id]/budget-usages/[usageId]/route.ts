import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow } from "@/lib/auth";
import { z } from "zod";
import { recalcActivityRealisasi } from "@/lib/realisasi";

async function assertCanAccessUsage(activityId: string, usageId: string) {
  const user = await getActiveUserOrThrow();

  const usage = await prisma.activityBudgetUsage.findUnique({
    where: { id: usageId },
    include: {
      activity: {
        select: {
          id: true,
          subbagId: true,
        },
      },
      budgetAllocation: {
        include: {
          budgetAccount: true,
          subbag: true,
        },
      },
    },
  });

  if (!usage || usage.activityId !== activityId) {
    return { usage: null as any, user };
  }

  if (user.role !== "SUPER_ADMIN" && usage.activity.subbagId !== user.subbagId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { usage, user };
}

async function recalcActivityUsed(activityId: string) {
  await recalcActivityRealisasi(activityId);
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; usageId: string }> }
) {
  const params = await ctx.params;
  const access = await assertCanAccessUsage(params.id, params.usageId);
  if (access instanceof NextResponse) return access;
  if (!access.usage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: access.usage });
}

const PatchSchema = z.object({
  amountUsed: z.coerce.number().int().min(0),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; usageId: string }> }
) {
  const params = await ctx.params;
  const access = await assertCanAccessUsage(params.id, params.usageId);
  if (access instanceof NextResponse) return access;
  if (!access.usage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.amountUsed === 0) {
    await prisma.activityBudgetUsage.delete({
      where: { id: params.usageId },
    });

    await recalcActivityUsed(params.id);

    return NextResponse.json({ ok: true, deleted: true });
  }

  const item = await prisma.activityBudgetUsage.update({
    where: { id: params.usageId },
    data: {
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

  await recalcActivityUsed(params.id);

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; usageId: string }> }
) {
  const params = await ctx.params;
  const access = await assertCanAccessUsage(params.id, params.usageId);
  if (access instanceof NextResponse) return access;
  if (!access.usage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.activityBudgetUsage.delete({
    where: { id: params.usageId },
  });

  await recalcActivityUsed(params.id);

  return NextResponse.json({ ok: true });
}
