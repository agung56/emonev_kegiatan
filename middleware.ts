import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "ohgitu_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Biarkan semua API route berjalan tanpa redirect
  if (pathname.startsWith("/api")) return NextResponse.next();

  // Skip Next internals + route publik
  const publicPaths = ["/login", "/_next", "/favicon.ico", "/uploads"];
  if (publicPaths.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Skip semua file statis (dari /public), contoh: /logo-kpu.png, /test.txt
  // Ini akan mencegah redirect ke /login untuk asset statis
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};