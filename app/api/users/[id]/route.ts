import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["SUPER_ADMIN", "USER"]).optional(),
  subbagId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: any = { ...parsed.data };
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 10);
    delete data.password;
  }
  const updated = await prisma.user.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
