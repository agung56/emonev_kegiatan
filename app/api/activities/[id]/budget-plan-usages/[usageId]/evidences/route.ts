import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import { saveToPublicUploads } from "@/lib/upload";

const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; usageId: string }> }
) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN", "USER"]);

  const { id: activityId, usageId } = await ctx.params;
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "file wajib" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ ok: false, message: "Tipe file tidak didukung" }, { status: 400 });
  }

  const usage = await prisma.activityBudgetPlanUsage.findFirst({
    where: { id: usageId, activityId },
  });
  if (!usage) return NextResponse.json({ ok: false, message: "usage tidak ditemukan" }, { status: 404 });

  const saved = await saveToPublicUploads(file, `activities/${activityId}/evidence`);
  const created = await prisma.activityBudgetEvidence.create({
    data: {
      activityId,
      usageId,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      storageKey: saved.storageKey,
    },
  });

  return NextResponse.json({ ok: true, item: created });
}
