import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { logActivity } from "@/lib/logger";

export async function POST(req: Request) {
  const user = await getSession();
  if (user) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logActivity({
      userId: user.id,
      action: "LOGOUT",
      description: `User ${user.name} logout.`,
      ipAddress: ip,
    });
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

export async function GET(req: Request) {
  const user = await getSession();
  if (user) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    await logActivity({
      userId: user.id,
      action: "LOGOUT",
      description: `User ${user.name} logout.`,
      ipAddress: ip,
    });
  }
  const res = NextResponse.redirect(new URL("/login", req.url));
  clearSessionCookie(res);
  return res;
}
