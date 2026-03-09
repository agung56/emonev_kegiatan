import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import { z } from "zod";

const UpdateSchema = z.object({
  nama: z.string().min(3),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.strategicGoal.update({ where: { id: params.id }, data: { nama: parsed.data.nama } });
  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);

  // cascade delete indicators first (SQLite doesn't enforce cascade by default unless set)
  await prisma.performanceIndicator.deleteMany({ where: { strategicGoalId: params.id } });
  await prisma.strategicGoal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
