import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const user = await getActiveUserOrThrow();

  const act = await prisma.activity.findUnique({ where: { id: params.id } });
  if (!act) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "SUPER_ADMIN" && act.subbagId !== user.subbagId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const caption = String(form.get("caption") || "");

  if (!file) return NextResponse.json({ error: "file wajib" }, { status: 400 });

  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type)) return NextResponse.json({ error: "Tipe file harus jpg/png/webp/pdf" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buf = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

    const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${params.id}-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buf);

  const rec = await prisma.activityEvidence.create({
    data: {
      activityId: params.id,
      filePath: `/uploads/${filename}`,
      caption: caption || null,
      uploadedById: user.id,
    },
  });

  return NextResponse.redirect(new URL(`/kegiatan/${params.id}/edit`, req.url));
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params;
  const user = await getActiveUserOrThrow();
  const act = await prisma.activity.findUnique({ where: { id: params.id } });
  if (!act) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "SUPER_ADMIN" && act.subbagId !== user.subbagId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await prisma.activityEvidence.findMany({ where: { activityId: params.id }, orderBy: { uploadedAt: "desc" } });
  return NextResponse.json(rows);
}
