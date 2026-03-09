import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import { z } from "zod";

const PatchSchema = z.object({
  nama: z.string().min(3).optional(),
  tahun: z.number().int().optional(),
  keterangan: z.string().optional().nullable(),
  details: z
    .array(
      z.object({
        id: z.string().optional(),
        akun: z.string().min(2),
        pagu: z.number().int().nonnegative(),
        sortOrder: z.number().int().optional(),
      })
    )
    .optional(),
});

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  await getActiveUserOrThrow();

  const { id } = ctx.params;

  const item = await prisma.budgetPlan.findUnique({
    where: { id },
    include: {
      details: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!item) {
    return NextResponse.json(
      { ok: false, message: "Budget plan tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, item });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const user = await getActiveUserOrThrow();
    requireRole(user, ["SUPER_ADMIN"]);

    const { id } = ctx.params;
    const patch = PatchSchema.parse(await req.json());

    const existing = await prisma.budgetPlan.findUnique({
      where: { id },
      include: {
        details: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, message: "Budget plan tidak ditemukan" },
        { status: 404 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.budgetPlan.update({
        where: { id },
        data: {
          nama: patch.nama,
          tahun: patch.tahun,
          keterangan: patch.keterangan ?? undefined,
        },
      });

      if (patch.details) {
        const existingDetails = existing.details;
        const existingIds = existingDetails.map((d) => d.id);
        const incomingIds = patch.details
          .map((d) => d.id)
          .filter(Boolean) as string[];

        const idsToDelete = existingIds.filter((detailId) => !incomingIds.includes(detailId));

        if (idsToDelete.length > 0) {
          const usedIds = await tx.activityBudgetPlanUsage.findMany({
            where: {
              budgetPlanDetailId: { in: idsToDelete },
            },
            select: {
              budgetPlanDetailId: true,
            },
            distinct: ["budgetPlanDetailId"],
          });

          const usedIdSet = new Set(usedIds.map((x) => x.budgetPlanDetailId));
          const blockedDeleteIds = idsToDelete.filter((detailId) => usedIdSet.has(detailId));
          const safeDeleteIds = idsToDelete.filter((detailId) => !usedIdSet.has(detailId));

          if (blockedDeleteIds.length > 0) {
            return NextResponse.json(
              {
                ok: false,
                message:
                  "Ada detail anggaran yang sudah dipakai kegiatan, jadi tidak bisa dihapus. Anda masih bisa mengubah akun dan pagunya.",
              },
              { status: 400 }
            );
          }

          if (safeDeleteIds.length > 0) {
            await tx.budgetPlanDetail.deleteMany({
              where: {
                id: { in: safeDeleteIds },
                budgetPlanId: id,
              },
            });
          }
        }

        for (let idx = 0; idx < patch.details.length; idx++) {
          const d = patch.details[idx];

          if (d.id) {
            const found = existingDetails.find((x) => x.id === d.id);
            if (!found) {
              throw new Error(`Detail anggaran dengan id ${d.id} tidak ditemukan.`);
            }

            await tx.budgetPlanDetail.update({
              where: { id: d.id },
              data: {
                akun: d.akun,
                pagu: d.pagu,
                sortOrder: d.sortOrder ?? idx,
              },
            });
          } else {
            await tx.budgetPlanDetail.create({
              data: {
                budgetPlanId: id,
                akun: d.akun,
                pagu: d.pagu,
                sortOrder: d.sortOrder ?? idx,
              },
            });
          }
        }

        const freshDetails = await tx.budgetPlanDetail.findMany({
          where: { budgetPlanId: id },
          select: { pagu: true },
        });

        const totalPagu = freshDetails.reduce((sum, d) => sum + (d.pagu || 0), 0);

        await tx.budgetPlan.update({
          where: { id },
          data: { totalPagu },
        });
      }

      return tx.budgetPlan.findUnique({
        where: { id },
        include: {
          details: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      });
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (error: any) {
    console.error("PATCH /api/budget-plans/[id] error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, message: "Payload tidak valid", error: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: error?.message || "Terjadi kesalahan saat mengubah budget plan",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const user = await getActiveUserOrThrow();
    requireRole(user, ["SUPER_ADMIN"]);

    const { id } = ctx.params;

    const details = await prisma.budgetPlanDetail.findMany({
      where: { budgetPlanId: id },
      select: { id: true },
    });

    const detailIds = details.map((d) => d.id);

    if (detailIds.length > 0) {
      const usedCount = await prisma.activityBudgetPlanUsage.count({
        where: {
          budgetPlanDetailId: { in: detailIds },
        },
      });

      if (usedCount > 0) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "Budget plan tidak bisa dihapus karena sudah dipakai pada kegiatan.",
          },
          { status: 400 }
        );
      }
    }

    await prisma.budgetPlan.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/budget-plans/[id] error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: error?.message || "Terjadi kesalahan saat menghapus budget plan",
      },
      { status: 500 }
    );
  }
}