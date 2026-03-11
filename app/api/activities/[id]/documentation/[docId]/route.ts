import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

async function deletePhysicalFile(storageKey: string) {
  if (!storageKey) return;

  const normalized = storageKey.replace(/\\/g, "/");

  // contoh storageKey: /uploads/activities/xxx/docs/file.pdf
  const relativePath = normalized.startsWith("/")
    ? normalized.slice(1)
    : normalized;

  const absolutePath = path.join(process.cwd(), "public", relativePath);

  try {
    await fs.unlink(absolutePath);
  } catch (error: any) {
    // abaikan kalau file memang sudah tidak ada
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

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

    await deletePhysicalFile(doc.storageKey);
  });

  return NextResponse.json({ ok: true });
}
