import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function POST() {
  clearSession();
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  clearSession();
  return NextResponse.redirect(new URL("/login", req.url));
}
