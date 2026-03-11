import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow } from "@/lib/auth";

function safeJoinPublic(storageKey: string) {
  const raw = String(storageKey || "");
  if (!raw.startsWith("/uploads/")) return null;

  const normalized = path.posix.normalize(raw);
  if (!normalized.startsWith("/uploads/") || normalized.includes("..")) return null;

  return path.join(process.cwd(), "public", normalized);
}

function escapeHtml(input: string) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inferContentType(fileName: string) {
  const ext = String(path.extname(fileName || "")).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ docId: string; fileName: string }> }
) {
  const params = await ctx.params;
  const user = await getActiveUserOrThrow();

  const doc = await prisma.activityDocumentation.findUnique({
    where: { id: params.docId },
    select: {
      id: true,
      activityId: true,
      fileName: true,
      mimeType: true,
      storageKey: true,
      activity: { select: { subbagId: true } },
    },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "SUPER_ADMIN" && doc.activity?.subbagId !== user.subbagId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fullPath = safeJoinPublic(doc.storageKey);
  if (!fullPath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const isDownload = url.searchParams.get("download") === "1";
  const isRaw = url.searchParams.get("raw") === "1";

  const displayName = String(doc.fileName || params.fileName || "file");
  const contentType =
    doc.mimeType && doc.mimeType !== "application/octet-stream"
      ? doc.mimeType
      : inferContentType(displayName);

  // Default: tampilkan viewer HTML di tab baru (tidak auto-download).
  if (!isDownload && !isRaw) {
    const safeTitle = escapeHtml(displayName);
    const isPdf = contentType === "application/pdf" || displayName.toLowerCase().endsWith(".pdf");
    const isImage = contentType.startsWith("image/");

    const basePath = `/files/docs/${encodeURIComponent(doc.id)}/${encodeURIComponent(params.fileName)}`;
    const rawUrl = `${basePath}?raw=1`;
    const downloadUrl = `${basePath}?download=1`;

    const body = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      :root { color-scheme: light dark; }
      body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background: #0b1220; color: #e5e7eb; }
      @media (prefers-color-scheme: light) { body { background: #f8fafc; color: #0f172a; } }
      .wrap { max-width: 1100px; margin: 0 auto; padding: 16px; }
      .bar { display:flex; gap:12px; align-items:center; justify-content:space-between; padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,.04); border: 1px solid rgba(148,163,184,.25); backdrop-filter: blur(14px); }
      @media (prefers-color-scheme: light) { .bar { background: rgba(255,255,255,.75); border-color: rgba(148,163,184,.35); } }
      .name { font-weight: 800; font-size: 14px; overflow:hidden; text-overflow: ellipsis; white-space: nowrap; }
      .btns { display:flex; gap:10px; align-items:center; flex-wrap: wrap; }
      a.btn { text-decoration:none; display:inline-flex; align-items:center; justify-content:center; padding:10px 12px; border-radius: 12px; font-weight: 800; font-size: 13px; border:1px solid rgba(148,163,184,.3); color: inherit; background: rgba(15,23,42,.25); }
      a.btn:hover { filter: brightness(1.08); }
      a.primary { background: rgba(59,130,246,.18); border-color: rgba(59,130,246,.35); }
      a.dl { background: rgba(16,185,129,.16); border-color: rgba(16,185,129,.32); }
      .card { margin-top: 12px; border-radius: 16px; overflow: hidden; border: 1px solid rgba(148,163,184,.25); background: rgba(255,255,255,.03); }
      @media (prefers-color-scheme: light) { .card { background: #fff; border-color: rgba(148,163,184,.35); } }
      iframe { width: 100%; height: calc(100vh - 120px); border: 0; background: transparent; }
      img { display:block; width: 100%; height: auto; }
      .empty { padding: 18px; font-size: 13px; line-height: 1.5; color: rgba(148,163,184,1); }
      @media (prefers-color-scheme: light) { .empty { color: rgba(71,85,105,1); } }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="bar">
        <div class="name" title="${safeTitle}">${safeTitle}</div>
        <div class="btns">
          <a class="btn" href="javascript:history.back()">Kembali</a>
          <a class="btn primary" href="${rawUrl}" target="_blank" rel="noreferrer">Buka File</a>
          <a class="btn dl" href="${downloadUrl}">Download</a>
        </div>
      </div>

      <div class="card">
        ${
          isPdf
            ? `<iframe src="${rawUrl}"></iframe>`
            : isImage
              ? `<img src="${rawUrl}" alt="${safeTitle}" />`
              : `<div class="empty">Preview untuk tipe file ini belum didukung di browser.<br/>Silakan klik <b>Download</b> atau <b>Buka File</b>.<br/><br/><code>${escapeHtml(contentType)}</code></div>`
        }
      </div>
    </div>
  </body>
</html>`;

    return new Response(body, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  }

  // raw/download: return bytes
  const buf = await fs.readFile(fullPath).catch(() => null);
  if (!buf) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const downloadName = displayName.replace(/\"/g, "");
  const disposition = isDownload ? `attachment; filename="${downloadName}"` : undefined;

  return new Response(buf, {
    headers: {
      "Content-Type": contentType,
      ...(disposition ? { "Content-Disposition": disposition } : {}),
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
