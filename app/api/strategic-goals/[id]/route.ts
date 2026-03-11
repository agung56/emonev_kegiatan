import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import { z } from "zod";

const UpdateSchema = z.object({
  nama: z.string().min(3),
});

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);
  const { id } = await ctx.params;

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.strategicGoal.update({ where: { id }, data: { nama: parsed.data.nama } });
  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);
  const { id } = await ctx.params;

  // cascade delete indicators first (SQLite doesn't enforce cascade by default unless set)
  await prisma.performanceIndicator.deleteMany({ where: { strategicGoalId: id } });
  await prisma.strategicGoal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
