import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: Request) {
  await getActiveUserOrThrow();
  const { searchParams } = new URL(req.url);
  const tahun = Number(searchParams.get("tahun") || new Date().getFullYear());

  const items = await prisma.budgetGlobal.findMany({
    where: { tahun },
    orderBy: [{ akun: "asc" }],
  });

  return NextResponse.json({ ok: true, items });
}

const CreateSchema = z.object({
  akun: z.string().min(1),
  tahun: z.number().int(),
  pagu: z.number().int().min(0),
  keterangan: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse({
    akun: String(body.akun || "").trim(),
    tahun: Number(body.tahun || new Date().getFullYear()),
    pagu: Number(body.pagu || 0),
    keterangan: body.keterangan ? String(body.keterangan) : null,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });

  const created = await prisma.budgetGlobal.create({ data: parsed.data });
  return NextResponse.json({ ok: true, item: created });
}
