import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { setSession } from "@/lib/auth";

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
  const body = await readBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: "Email/password wajib" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return NextResponse.json({ ok: false, message: "User tidak ditemukan/nonaktif" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ ok: false, message: "Password salah" }, { status: 401 });
  }

  setSession({ id: user.id, email: user.email, name: user.name, role: user.role, subbagId: user.subbagId });

  return NextResponse.json({ ok: true, role: user.role, subbagId: user.subbagId });
}
