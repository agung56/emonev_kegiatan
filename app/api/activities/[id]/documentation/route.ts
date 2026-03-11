import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";
import { saveToPublicUploads } from "@/lib/upload";
import { checkActivityFileLimit } from "@/lib/uploadLimits";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function isAllowedFile(file: File) {
  if (ALLOWED_TYPES.has(file.type)) return true;

  const name = file.name.toLowerCase();
  return (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp") ||
    name.endsWith(".pdf") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx")
  );
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN", "USER"]);

  const { id: activityId } = await ctx.params;

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

  const form = await req.formData();

  const files = form.getAll("files").filter((v): v is File => v instanceof File);
  const legacyFile = form.get("file");
  const uploadFiles = files.length
    ? files
    : legacyFile instanceof File
      ? [legacyFile]
      : [];

  if (!uploadFiles.length) {
    return NextResponse.json({ ok: false, message: "File wajib diunggah" }, { status: 400 });
  }

  const limit = await checkActivityFileLimit(activityId, uploadFiles.length);
  if (!limit.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: `Batas file per kegiatan adalah ${limit.max}. Saat ini sudah ada ${limit.used} file. Sisa slot: ${limit.remaining}.`,
      },
      { status: 400 }
    );
  }

  for (const file of uploadFiles) {
    if (!isAllowedFile(file)) {
      return NextResponse.json(
        { ok: false, message: `Format file tidak didukung: ${file.name}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, message: `Ukuran file maksimal 2 MB per file: ${file.name}` },
        { status: 400 }
      );
    }
  }

  const createdItems = [];

  for (const file of uploadFiles) {
    const saved = await saveToPublicUploads(file, `activities/${activityId}/docs`);

    const created = await prisma.activityDocumentation.create({
       data: {
        activityId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        storageKey: saved.storageKey,
      },
    });

    createdItems.push(created);
  }

  return NextResponse.json({
    ok: true,
    count: createdItems.length,
    items: createdItems,
  });

}
