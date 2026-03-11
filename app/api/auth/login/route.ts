import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { applySessionCookie } from "@/lib/auth";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

async function readBody(req: Request) {
  const ct = req.headers.get("content-type") || "";
  // JSON
  if (ct.includes("application/json")) {
    const b = await req.json().catch(() => ({} as any));
    return { email: String(b.email || ""), password: String(b.password || "") };
  }
  // Form (x-www-form-urlencoded / multipart)
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const fd = await req.formData().catch(() => null);
    return { email: String(fd?.get("email") || ""), password: String(fd?.get("password") || "") };
  }
  // fallback
  return { email: "", password: "" };
}

export async function POST(req: Request) {
  try {
    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { ok: false, message: "Konfigurasi server belum lengkap: JWT_SECRET belum di-set." },
        { status: 500 }
      );
    }

    // Import prisma/logging secara dinamis supaya kalau Prisma engine/env bermasalah,
    // kita tetap bisa balas JSON (bukan HTML 500 bawaan Next).
    const { prisma } = await import("@/lib/prisma");

    const body = await readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ ok: false, message: "Email/password wajib" }, { status: 400 });
    }

    const user = await withTimeout(
      prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          subbagId: true,
          isActive: true,
          passwordHash: true,
          subbag: { select: { nama: true } },
        },
      }),
      8000,
      "DB"
    );

    if (!user || !user.isActive) {
      return NextResponse.json({ ok: false, message: "User tidak ditemukan/nonaktif" }, { status: 401 });
    }

    const ok = await withTimeout(bcrypt.compare(password, user.passwordHash), 5000, "Password check");
    if (!ok) {
      return NextResponse.json({ ok: false, message: "Password salah" }, { status: 401 });
    }

    const res = NextResponse.json({
      ok: true,
      role: user.role,
      subbagId: user.subbagId,
      subbagName: user.subbag?.nama ?? null,
    });

    applySessionCookie(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      subbagId: user.subbagId,
      subbagName: user.subbag?.nama ?? null,
    });

    return res;
  } catch (err: any) {
    const message = String(err?.message || "Internal error");
    console.error("Login error:", err);

    let friendly = "Server error saat login.";
    if (message.toLowerCase().includes("timeout")) {
      friendly = "Server lambat/DB timeout. Coba lagi.";
    } else if (message.includes("JWT_SECRET")) {
      friendly = "Konfigurasi server belum lengkap: JWT_SECRET belum di-set.";
    } else if (message.includes("Prisma Client could not locate the Query Engine")) {
      friendly =
        "Prisma engine tidak cocok/kurang di server. Pastikan upload `dist/` terbaru yang sudah `prisma generate` untuk Linux.";
    } else if (message.includes("Access denied for user") || message.includes("1045")) {
      friendly = "DATABASE_URL salah (akses ditolak). Periksa user/password/host/db di cPanel Env.";
    }

    return NextResponse.json(
      {
        ok: false,
        message: friendly,
      },
      { status: 500 }
    );
  }
}
