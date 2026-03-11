import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["SUPER_ADMIN", "USER"]).optional(),
  subbagId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);
  const { id } = await ctx.params;

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: any = { ...parsed.data };
  if (typeof data.email === "string") data.email = data.email.trim().toLowerCase();
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 10);
    delete data.password;
  }
  try {
    const updated = await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ ok: true, id: updated.id });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: { message: "Email sudah digunakan." } }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);
  const { id } = await ctx.params;
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
