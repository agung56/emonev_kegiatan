import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import { deletePublicUpload } from "@/lib/upload";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; evidenceId: string }> }
) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN", "USER"]);

  const { id: activityId, evidenceId } = await ctx.params;

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { id: true, subbagId: true },
  });

  if (!activity) {
    return NextResponse.json({ ok: false, message: "Kegiatan tidak ditemukan" }, { status: 404 });
  }

  if (user.role !== "SUPER_ADMIN" && activity.subbagId !== user.subbagId) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const evidence = await prisma.activityEvidence.findFirst({
    where: { id: evidenceId, activityId },
  });

  if (!evidence) {
    return NextResponse.json({ ok: false, message: "Evidence tidak ditemukan" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.activityEvidence.delete({ where: { id: evidenceId } });
    await deletePublicUpload(evidence.filePath);
  });

  return NextResponse.json({ ok: true });
}

