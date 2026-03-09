import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { Role, User } from "@prisma/client";

export type SessionUser = Pick<User, "id" | "email" | "name" | "role" | "subbagId">;

const COOKIE_NAME = "ohgitu_session";

function secret() {
  // fallback untuk dev agar tidak 500 kalau .env belum lengkap
  return process.env.JWT_SECRET || "iniakunrahasia";
}

export function setSession(user: SessionUser) {
  const token = jwt.sign({ user }, secret(), { expiresIn: "7d" });
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSession() {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, secret()) as any;
    return payload?.user ?? null;
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
  const dbUser = await prisma.user.findUnique({ where: { id: sess.id } });
  if (!dbUser || !dbUser.isActive) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return sess;
}
