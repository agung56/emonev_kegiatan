import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "ohgitu_session";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Biarkan semua API route berjalan tanpa redirect
  if (pathname.startsWith("/api")) return NextResponse.next();

  // Skip Next internals + route publik
  const publicPaths = ["/login", "/_next", "/favicon.ico"];
  if (publicPaths.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Jangan expose /public/uploads langsung. Akses file harus lewat route ber-auth (contoh: /files/docs/...).
  if (pathname.startsWith("/uploads/")) {
    return new NextResponse("Not Found", { status: 404 });
  }

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
