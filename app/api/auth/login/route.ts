import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { applySessionCookie } from "@/lib/auth";

type LoginUser = {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "USER";
  subbagId: string | null;
  isActive: boolean;
  passwordHash: string;
  subbag: { nama: string } | null;
};

function validateDatabaseUrl(dbUrl: string | undefined) {
  const raw = String(dbUrl || "").trim();
  if (!raw) {
    return { ok: false as const, message: "Konfigurasi server belum lengkap: DATABASE_URL belum di-set." };
  }

  // Heuristik umum: jika ada lebih dari 1 '@' di bagian auth+host, biasanya password mengandung '@' tapi belum di-encode (%40)
  const noScheme = raw.replace(/^[a-z]+:\/\//i, "");
  const authPlusHost = (noScheme.split("/")[0] ?? noScheme).trim();
  const atCount = (authPlusHost.match(/@/g) || []).length;
  if (atCount > 1) {
    return {
      ok: false as const,
      message:
        "DATABASE_URL tidak valid: kemungkinan password mengandung '@' tapi belum di-URL-encode menjadi '%40'. (Set env di cPanel tanpa tanda kutip).",
    };
  }

  // Quick heuristic for common mistake: unencoded '#'
  // (will be treated as URL fragment and break parsing in Prisma).
  if (raw.includes("#")) {
    return {
      ok: false as const,
      message:
        "DATABASE_URL tidak valid: password mengandung karakter '#' yang wajib di-URL-encode menjadi '%23'. (Jangan pakai tanda kutip di cPanel Env).",
    };
  }

  try {
    const u = new URL(raw);
    if (u.protocol !== "mysql:" && u.protocol !== "mariadb:") {
      return { ok: false as const, message: "DATABASE_URL tidak valid: protocol harus mysql." };
    }
    if (!u.hostname) {
      return { ok: false as const, message: "DATABASE_URL tidak valid: host kosong." };
    }
    if (!u.pathname || u.pathname === "/") {
      return { ok: false as const, message: "DATABASE_URL tidak valid: nama database kosong." };
    }
    // URL() akan throw jika port invalid, jadi jika lolos di sini port aman.
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      message:
        "DATABASE_URL tidak valid (gagal parsing). Jika password DB ada karakter spesial (@, #, $, ], dll) harus di-URL-encode.",
    };
  }
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
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

    const dbCheck = validateDatabaseUrl(process.env.DATABASE_URL);
    if (!dbCheck.ok) {
      return NextResponse.json({ ok: false, message: dbCheck.message }, { status: 500 });
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

    const user = await withTimeout<LoginUser | null>(
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
      }) as unknown as PromiseLike<LoginUser | null>,
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
    } else if (
      message.includes("The provided database string is invalid") ||
      message.includes("Error parsing connection string") ||
      message.includes("invalid port number")
    ) {
      friendly =
        "DATABASE_URL tidak valid. Jika password DB ada karakter spesial (@, #, $, ], dll) harus di-URL-encode. Cek env di cPanel/.env.";
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
