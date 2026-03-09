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

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await assertCanAccessActivity(params.id);
  if (access instanceof NextResponse) return access;
  if (!access.act) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await prisma.activityBudgetDetail.findMany({
    where: { activityId: params.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ items });
}

const CreateSchema = z.object({
  kode: z.string().max(64).optional().nullable(),
  uraian: z.string().min(1),
  volume: z.coerce.number().nonnegative(),
  hargaSatuan: z.coerce.number().int().nonnegative(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const access = await assertCanAccessActivity(params.id);
  if (access instanceof NextResponse) return access;
  if (!access.act) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const jumlah = toIntCurrency(parsed.data.volume * parsed.data.hargaSatuan);

  const item = await prisma.activityBudgetDetail.create({
    data: {
      activityId: params.id,
      kode: parsed.data.kode ?? null,
      uraian: parsed.data.uraian,
      volume: parsed.data.volume,
      hargaSatuan: parsed.data.hargaSatuan,
      jumlah,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });

  await recalcActivityBudget(params.id);
  return NextResponse.json({ item }, { status: 201 });
}
