import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: Request) {
  await getActiveUserOrThrow();
  const { searchParams } = new URL(req.url);
  const tahun = Number(searchParams.get("tahun") || new Date().getFullYear());
  const kepemilikan = searchParams.get("kepemilikan") || "LEMBAGA";
  const rows = await prisma.strategicGoal.findMany({
    where: { tahun, kepemilikan: kepemilikan as any },
    orderBy: { nama: "asc" },
  });
  return NextResponse.json(rows);
}

const Schema = z.object({
  tahun: z.coerce.number().int(),
  kepemilikan: z.enum(["LEMBAGA", "SEKRETARIAT"]),
  nama: z.string().min(3),
});

export async function POST(req: Request) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const created = await prisma.strategicGoal.create({ data: parsed.data });
  return NextResponse.json(created);
}
