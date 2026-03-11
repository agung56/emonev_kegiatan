import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { Role, User } from "@prisma/client";
import type { NextResponse } from "next/server";

export type SessionUser = Pick<User, "id" | "email" | "name" | "role" | "subbagId"> & {
  subbagName?: string | null;
};

const COOKIE_NAME = "ohgitu_session";

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) {
    throw new Error("JWT_SECRET wajib di-set (lihat .env.example).");
  }
  if (process.env.NODE_ENV === "production" && s.length < 32) {
    throw new Error("JWT_SECRET terlalu pendek untuk production (min 32 karakter).");
  }
  return s;
}

export function signSessionToken(user: SessionUser) {
  const token = jwt.sign({ user }, secret(), { expiresIn: "30m" });
  return token;
}

export function applySessionCookie(res: NextResponse, user: SessionUser) {
  const token = signSessionToken(user);
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Tanpa maxAge = session cookie, hilang saat browser ditutup
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, secret()) as any;
    const user = payload?.user ?? null;
    if (!user) return null;

    // Backward-compat: older session tokens may contain role as "SUPER ADMIN"
    if (typeof user.role === "string") {
      const normalizedRole = user.role.trim().toUpperCase().replace(/\s+/g, "_");
      if (normalizedRole === "SUPER_ADMIN" || normalizedRole === "USER") {
        return { ...user, role: normalizedRole } as SessionUser;
      }
    }

    return user as SessionUser;
  } catch {
    return null;
  }
}

export function requireRole(user: SessionUser, roles: Role[]) {
  if (!roles.includes(user.role)) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

export async function getActiveUserOrThrow() {
  const sess = await getSession();
  if (!sess) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  const { prisma } = await import("./prisma");
  const dbUser = await prisma.user.findUnique({ where: { id: sess.id } });
  if (!dbUser || !dbUser.isActive) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return sess;
}
