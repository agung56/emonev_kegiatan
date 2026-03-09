import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow } from "@/lib/auth";
import { z } from "zod";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getActiveUserOrThrow();

  const row = await prisma.activity.findUnique({
    where: { id: params.id },
    include: {
      subbag: true,
      budgetAccount: true,

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

      evidences: true,

      budgetDetails: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },

      budgetUsages: {
        include: {
          budgetAllocation: {
            include: {
              budgetAccount: true,
              subbag: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
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
          evidences: true,
        },
        orderBy: { createdAt: "asc" },
      },

      documentations: true,
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.role !== "SUPER_ADMIN" && row.subbagId !== user.subbagId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(row);
}

const Schema = z.object({
  namaKegiatan: z.string().min(3),
  lokus: z.string().min(1),

  tanggalMulai: z.string().min(1),
  tanggalSelesai: z.string().min(1),

  strategicGoalId: z.string().min(1, "Sasaran kegiatan wajib dipilih"),

  targetKinerja: z.string().min(1),
  capaianKinerja: z.string().min(1),
  kendala: z.string(),
  outputKegiatan: z.string(),

  indicatorIds: z.array(z.string()).default([]),
});

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getActiveUserOrThrow();

  const existing = await prisma.activity.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      subbagId: true,
      tahun: true,
      kepemilikan: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.role !== "SUPER_ADMIN" && existing.subbagId !== user.subbagId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

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

  if (strategicGoal.tahun !== existing.tahun) {
    return NextResponse.json(
      { error: "Sasaran kegiatan tidak sesuai dengan tahun kegiatan." },
      { status: 400 }
    );
  }

  if (strategicGoal.kepemilikan !== existing.kepemilikan) {
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
        item.tahun !== existing.tahun ||
        item.kepemilikan !== existing.kepemilikan
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

  const updated = await prisma.activity.update({
    where: { id: params.id },
    data: {
      namaKegiatan: parsed.data.namaKegiatan,
      lokus: parsed.data.lokus,
      tanggalMulai,
      tanggalSelesai,
      targetKinerja: parsed.data.targetKinerja,
      capaianKinerja: parsed.data.capaianKinerja,
      kendala: parsed.data.kendala,
      outputKegiatan: parsed.data.outputKegiatan,

      strategicGoals: {
        deleteMany: {},
        create: [
          {
            goalId: parsed.data.strategicGoalId,
          },
        ],
      },

      indicators: {
        deleteMany: {},
        create: parsed.data.indicatorIds.map((id) => ({
          indicatorId: id,
        })),
      },
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
          evidences: true,
        },
      },
      documentations: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getActiveUserOrThrow();

  const existing = await prisma.activity.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.role !== "SUPER_ADMIN" && existing.subbagId !== user.subbagId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.activity.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}