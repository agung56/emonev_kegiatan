import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import { z } from "zod";

const UpdateSchema = z.object({
  akun: z.string().min(1),
  tahun: z.number().int(),
  pagu: z.number().int().min(0),
  keterangan: z.string().optional().nullable(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse({
    akun: String(body.akun || "").trim(),
    tahun: Number(body.tahun || new Date().getFullYear()),
    pagu: Number(body.pagu || 0),
    keterangan: body.keterangan ? String(body.keterangan) : null,
  });
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.budgetGlobal.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true, item: updated });
}
