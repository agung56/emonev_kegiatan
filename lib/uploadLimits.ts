import { prisma } from "@/lib/prisma";

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return NaN;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function getMaxFilesPerActivity() {
  const raw = String(process.env.MAX_FILES_PER_ACTIVITY || "").trim();
  const n = raw ? Number(raw) : NaN;
  // Default 5 (sesuai permintaan 4-5 file/kegiatan), bisa di-override via env.
  return clampInt(n, 1, 50) || 5;
}

export async function checkActivityFileLimit(activityId: string, additionalFiles: number) {
  const max = getMaxFilesPerActivity();
  const add = clampInt(Number(additionalFiles || 0), 0, 50);

  const [docs, evidences, budgetEvidences] = await prisma.$transaction([
    prisma.activityDocumentation.count({ where: { activityId } }),
    prisma.activityEvidence.count({ where: { activityId } }),
    prisma.activityBudgetEvidence.count({ where: { activityId } }),
  ]);

  const used = docs + evidences + budgetEvidences;
  const remaining = Math.max(0, max - used);
  const ok = used + add <= max;

  return { ok, max, used, remaining };
}
