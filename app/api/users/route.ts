import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

export async function GET(req: Request) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
  const takeRaw = Number(url.searchParams.get("take") || 0) || 0;
  const take = takeRaw > 0 ? Math.min(100, takeRaw) : 0;
  const skip = take > 0 ? (page - 1) * take : 0;

  const rows = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      subbagId: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    ...(take > 0 ? { skip, take } : {}),
  });

  return NextResponse.json(rows);
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
