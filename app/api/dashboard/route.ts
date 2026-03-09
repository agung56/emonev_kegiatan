import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getActiveUserOrThrow();
  const { searchParams } = new URL(req.url);
  const tahun = Number(searchParams.get("tahun") || new Date().getFullYear());
  const subbagIdParam = searchParams.get("subbagId");

  const subbagId = user.role === "SUPER_ADMIN" ? (subbagIdParam || undefined) : (user.subbagId || undefined);

  const where: any = { tahun };
  if (subbagId) where.subbagId = subbagId;

  const activities = await prisma.activity.findMany({
    where,
    include: { subbag: true, budgetAccount: true, evidences: true },
    orderBy: { createdAt: "desc" },
  });

  // compute sisa pagu per akun (tahun + subbag)
  const accountTotals: Record<string, { pagu: number; realisasi: number }> = {};
  const budgets = await prisma.budgetAllocation.findMany({
    where: { tahun, ...(subbagId ? { subbagId } : {}) },
  });
  for (const b of budgets) {
    const k = `${b.subbagId || "ALL"}:${b.budgetAccountId}`;
    accountTotals[k] = accountTotals[k] || { pagu: 0, realisasi: 0 };
    accountTotals[k].pagu += b.pagu;
  }
  const sums = await prisma.activity.groupBy({
    by: ["subbagId", "budgetAccountId"],
    where,
    _sum: { realisasiAnggaran: true },
  });
  for (const s of sums) {
    const k = `${s.subbagId}:${s.budgetAccountId}`;
    accountTotals[k] = accountTotals[k] || { pagu: 0, realisasi: 0 };
    accountTotals[k].realisasi = s._sum.realisasiAnggaran || 0;
  }

  const result = activities.map((a) => {
    const k = `${a.subbagId}:${a.budgetAccountId}`;
    const tot = accountTotals[k] || { pagu: 0, realisasi: 0 };
    const sisa = Math.max(0, tot.pagu - tot.realisasi);
    return {
      id: a.id,
      subbag: a.subbag.nama,
      namaKegiatan: a.namaKegiatan,
      lokus: a.lokus,
      realisasiAnggaran: a.realisasiAnggaran,
      sisaPaguAnggaran: sisa,
      outputKegiatan: a.outputKegiatan,
      kendala: a.kendala,
      evidenceCount: a.evidences.length,
    };
  });

  return NextResponse.json({ tahun, subbagId: subbagId || null, activities: result });
}
