import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import { z } from "zod";

const UpdateSchema = z.object({
  nama: z.string().min(3),
  formulaPerhitungan: z.string().optional().nullable(),
  sumberData: z.string().optional().nullable(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.performanceIndicator.update({
    where: { id: params.id },
    data: {
      nama: parsed.data.nama,
      formulaPerhitungan: parsed.data.formulaPerhitungan ?? undefined,
      sumberData: parsed.data.sumberData ?? undefined,
    },
  });
  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);

  await prisma.performanceIndicator.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
