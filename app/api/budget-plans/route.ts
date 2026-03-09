import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import { z } from "zod";

const CreateSchema = z.object({
  nama: z.string().min(3),
  tahun: z.number().int(),
  keterangan: z.string().optional().nullable(),
  details: z.array(
    z.object({
      akun: z.string().min(2),
      pagu: z.number().int().nonnegative(),
      sortOrder: z.number().int().optional(),
    })
  ).min(1),
});

export async function GET() {
  const items = await prisma.budgetPlan.findMany({
    include: { details: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);

  const body = CreateSchema.parse(await req.json());
  const total = body.details.reduce((s, d) => s + d.pagu, 0);

  const created = await prisma.budgetPlan.create({
    data: {
      nama: body.nama,
      tahun: body.tahun,
      keterangan: body.keterangan ?? null,
      totalPagu: total,
      details: {
        create: body.details.map((d, idx) => ({
          akun: d.akun,
          pagu: d.pagu,
          sortOrder: d.sortOrder ?? idx,
        })),
      },
    },
    include: { details: true },
  });

  return NextResponse.json({ item: created }, { status: 201 });
}
