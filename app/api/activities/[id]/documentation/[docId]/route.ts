import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import { deletePublicUpload } from "@/lib/upload";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; docId: string }> }
) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN", "USER"]);

  const { id: activityId, docId } = await ctx.params;

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { id: true, subbagId: true },
  });

  if (!activity) {
    return NextResponse.json(
      { ok: false, message: "Kegiatan tidak ditemukan" },
      { status: 404 }
    );
  }

  if (user.role !== "SUPER_ADMIN" && activity.subbagId !== user.subbagId) {
    return NextResponse.json(
      { ok: false, message: "Forbidden" },
      { status: 403 }
    );
  }

  const doc = await prisma.activityDocumentation.findFirst({
    where: {
      id: docId,
      activityId,
    },
  });

  if (!doc) {
    return NextResponse.json(
      { ok: false, message: "Dokumentasi tidak ditemukan" },
      { status: 404 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.activityDocumentation.delete({
      where: { id: docId },
    });

    await deletePublicUpload(doc.storageKey);
  });

  return NextResponse.json({ ok: true });
}
