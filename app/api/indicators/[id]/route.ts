import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import { z } from "zod";

const UpdateSchema = z.object({
  nama: z.string().min(3),
  formulaPerhitungan: z.string().optional().nullable(),
  sumberData: z.string().optional().nullable(),
});

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);
  const { id } = await ctx.params;

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.performanceIndicator.update({
    where: { id },
    data: {
      nama: parsed.data.nama,
      formulaPerhitungan: parsed.data.formulaPerhitungan ?? undefined,
      sumberData: parsed.data.sumberData ?? undefined,
    },
  });
  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);
  const { id } = await ctx.params;

  await prisma.performanceIndicator.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
