import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow } from "@/lib/auth";
import { z } from "zod";
import { logActivity } from "@/lib/logger";

export async function GET(req: Request) {
  const user = await getActiveUserOrThrow();
  const { searchParams } = new URL(req.url);

  const tahun = Number(searchParams.get("tahun") || new Date().getFullYear());
  const subbagIdParam = searchParams.get("subbagId") || undefined;

  const where: any = { tahun };
  if (user.role !== "SUPER_ADMIN") where.subbagId = user.subbagId;
  else if (subbagIdParam) where.subbagId = subbagIdParam;

  const rows = await prisma.activity.findMany({
    where,
    include: {
      subbag: true,

      strategicGoals: {
        include: {
          goal: true,
        },
      },

      budgetAccount: true,

      indicators: {
        include: {
          indicator: true,
        },
      },

      evidences: true,

      budgetPlan: {
        include: {
          details: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      },

      budgetPlanUsages: {
        include: {
          budgetPlanDetail: true,
          evidences: true,
        },
      },

      documentations: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rows);
}

const Schema = z.object({
  tahun: z.coerce.number().int(),
  kepemilikan: z.enum(["LEMBAGA", "SEKRETARIAT"]),
  subbagId: z.string().optional(),

  namaKegiatan: z.string().min(3),
  lokus: z.string().min(1),

  strategicGoalId: z.string().min(1, "Sasaran kegiatan wajib dipilih"),

  tanggalMulai: z.string().optional(),
  tanggalSelesai: z.string().optional(),

  targetKinerja: z.string().min(1),
  capaianKinerja: z.string().min(1),
  kendala: z.string().default(""),
  outputKegiatan: z.string().default(""),

  indicatorIds: z.array(z.string()).default([]),

  budgetAccountId: z.string().optional(),
  realisasiAnggaran: z.coerce.number().int().nonnegative().optional(),

  budgetPlanId: z.string().optional().nullable(),
  budgetPlanUsages: z
    .array(
      z.object({
        budgetPlanDetailId: z.string(),
        amountUsed: z.number().int().nonnegative(),
      })
    )
    .optional(),
});

export async function POST(req: Request) {
  const user = await getActiveUserOrThrow();

  const body = await req.json();
  const parsed = Schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const subbagId =
    user.role === "SUPER_ADMIN"
      ? parsed.data.subbagId || user.subbagId
      : user.subbagId;

  if (!subbagId) {
    return NextResponse.json(
      { error: "Hanya operator subbag yang dapat mengisi kegiatan" },
      { status: 400 }
    );
  }

  const budgetPlanId = parsed.data.budgetPlanId ?? null;
  const usages = parsed.data.budgetPlanUsages ?? [];

  const totalRealisasiFromUsages = usages.reduce(
    (sum, item) => sum + (item.amountUsed || 0),
    0
  );

  const finalRealisasi =
    usages.length > 0
      ? totalRealisasiFromUsages
      : parsed.data.realisasiAnggaran ?? 0;

  const tanggalMulai = parsed.data.tanggalMulai
    ? new Date(parsed.data.tanggalMulai)
    : null;

  const tanggalSelesai = parsed.data.tanggalSelesai
    ? new Date(parsed.data.tanggalSelesai)
    : null;

  if (tanggalMulai && tanggalSelesai && tanggalSelesai < tanggalMulai) {
    return NextResponse.json(
      { error: "Tanggal selesai tidak boleh lebih kecil dari tanggal mulai" },
      { status: 400 }
    );
  }

  const strategicGoal = await prisma.strategicGoal.findUnique({
    where: { id: parsed.data.strategicGoalId },
    select: {
      id: true,
      tahun: true,
      kepemilikan: true,
    },
  });

  if (!strategicGoal) {
    return NextResponse.json(
      { error: "Sasaran kegiatan tidak ditemukan." },
      { status: 400 }
    );
  }

  if (strategicGoal.tahun !== parsed.data.tahun) {
    return NextResponse.json(
      { error: "Sasaran kegiatan tidak sesuai dengan tahun kegiatan." },
      { status: 400 }
    );
  }

  if (strategicGoal.kepemilikan !== parsed.data.kepemilikan) {
    return NextResponse.json(
      { error: "Sasaran kegiatan tidak sesuai dengan kepemilikan kegiatan." },
      { status: 400 }
    );
  }

  if (parsed.data.indicatorIds.length > 0) {
    const indicators = await prisma.performanceIndicator.findMany({
      where: {
        id: { in: parsed.data.indicatorIds },
      },
      select: {
        id: true,
        strategicGoalId: true,
        tahun: true,
        kepemilikan: true,
      },
    });

    if (indicators.length !== parsed.data.indicatorIds.length) {
      return NextResponse.json(
        { error: "Ada indikator yang tidak ditemukan." },
        { status: 400 }
      );
    }

    const invalidIndicator = indicators.find(
      (item) =>
        item.strategicGoalId !== parsed.data.strategicGoalId ||
        item.tahun !== parsed.data.tahun ||
        item.kepemilikan !== parsed.data.kepemilikan
    );

    if (invalidIndicator) {
      return NextResponse.json(
        {
          error:
            "Ada indikator yang tidak terkait dengan sasaran kegiatan yang dipilih.",
        },
        { status: 400 }
      );
    }
  }

  if (budgetPlanId && usages.length > 0) {
    const detailIds = usages.map((u) => u.budgetPlanDetailId);

    const count = await prisma.budgetPlanDetail.count({
      where: {
        id: { in: detailIds },
        budgetPlanId,
      },
    });

    if (count !== detailIds.length) {
      return NextResponse.json(
        {
          error:
            "Ada akun/detail anggaran yang tidak sesuai dengan Pagu Kegiatan yang dipilih.",
        },
        { status: 400 }
      );
    }
  }

  const created = await prisma.activity.create({
    data: {
      tahun: parsed.data.tahun,
      subbagId,
      kepemilikan: parsed.data.kepemilikan,
      namaKegiatan: parsed.data.namaKegiatan,
      lokus: parsed.data.lokus,
      tanggalMulai,
      tanggalSelesai,
      targetKinerja: parsed.data.targetKinerja,
      capaianKinerja: parsed.data.capaianKinerja,
      kendala: parsed.data.kendala,
      outputKegiatan: parsed.data.outputKegiatan,

      budgetAccountId: parsed.data.budgetAccountId || null,
      budgetPlanId,
      realisasiAnggaran: finalRealisasi,
      createdBy: user.id,

      strategicGoals: {
        create: [
          {
            goalId: parsed.data.strategicGoalId,
          },
        ],
      },

      indicators: {
        create: parsed.data.indicatorIds.map((id) => ({
          indicatorId: id,
        })),
      },

      budgetPlanUsages:
        usages.length > 0
          ? {
              create: usages.map((u) => ({
                budgetPlanDetailId: u.budgetPlanDetailId,
                amountUsed: u.amountUsed,
              })),
            }
          : undefined,
    },
    include: {
      strategicGoals: {
        include: {
          goal: true,
        },
      },

      indicators: {
        include: {
          indicator: true,
        },
      },

      budgetPlan: {
        include: {
          details: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      },

      budgetPlanUsages: {
        include: {
          budgetPlanDetail: true,
        },
      },
    },
  });


  // Log Activity
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  await logActivity({
    userId: user.id,
    action: "CREATE_ACTIVITY",
    description: `User ${user.name} membuat kegiatan baru: ${created.namaKegiatan}`,
    metadata: { activityId: created.id },
    ipAddress: ip,
  });

  return NextResponse.json({ ok: true, item: created });
}
