import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow } from "@/lib/auth";
import { z } from "zod";

function toIntCurrency(n: number) {
  return Math.round(n);
}

async function assertCanAccessActivity(activityId: string) {
  const user = await getActiveUserOrThrow();
  const act = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!act) return { act: null as any };

  if (user.role !== "SUPER_ADMIN" && act.subbagId !== user.subbagId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { act };
}

async function recalcActivityBudget(activityId: string) {
  const agg = await prisma.activityBudgetDetail.aggregate({
    where: { activityId },
    _sum: { jumlah: true },
  });
  await prisma.activity.update({
    where: { id: activityId },
    data: { realisasiAnggaran: agg._sum.jumlah ?? 0 },
  });
}

const PatchSchema = z.object({
  kode: z.string().max(64).optional().nullable(),
  uraian: z.string().min(1).optional(),
  volume: z.coerce.number().nonnegative().optional(),
  hargaSatuan: z.coerce.number().int().nonnegative().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string; detailId: string } }) {
  const access = await assertCanAccessActivity(params.id);
  if (access instanceof NextResponse) return access;
  if (!access.act) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const current = await prisma.activityBudgetDetail.findFirst({
    where: { id: params.detailId, activityId: params.id },
  });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextVolume = parsed.data.volume ?? Number(current.volume);
  const nextHarga = parsed.data.hargaSatuan ?? current.hargaSatuan;
  const nextJumlah = toIntCurrency(nextVolume * nextHarga);

  const item = await prisma.activityBudgetDetail.update({
    where: { id: params.detailId },
    data: {
      ...parsed.data,
      jumlah: nextJumlah,
    },
  });

  await recalcActivityBudget(params.id);
  return NextResponse.json({ item });
}

export async function DELETE(_req: Request, { params }: { params: { id: string; detailId: string } }) {
  const access = await assertCanAccessActivity(params.id);
  if (access instanceof NextResponse) return access;
  if (!access.act) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.activityBudgetDetail.deleteMany({ where: { id: params.detailId, activityId: params.id } });
  await recalcActivityBudget(params.id);

  return NextResponse.json({ ok: true });
}
