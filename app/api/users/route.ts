import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

export async function GET() {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);
  const rows = await prisma.user.findMany({ include: { subbag: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(rows.map(u => ({ ...u, passwordHash: undefined })));
}

const CreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["SUPER_ADMIN", "USER"]),
  subbagId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const hash = await bcrypt.hash(parsed.data.password, 10);
  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      passwordHash: hash,
      role: parsed.data.role,
      subbagId: parsed.data.subbagId || null,
      isActive: parsed.data.isActive ?? true,
    },
  });
  return NextResponse.json({ id: created.id });
}
