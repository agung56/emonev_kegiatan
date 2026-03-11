import { NextResponse } from "next/server";
import { applySessionCookie, getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Session expired" },
      { status: 401 }
    );
  }
  const res = NextResponse.json({ ok: true });
  applySessionCookie(res, session);
  return res;
}
