import { NextResponse } from "next/server";

function looksLikeUnencodedDatabaseUrl(dbUrl: string) {
  // Heuristik cepat: karakter ini seharusnya di-encode kalau muncul di password/userinfo.
  // Jika tidak di-encode, URL bisa ter-parse salah (host jadi aneh) dan koneksi DB timeout.
  if (dbUrl.includes("#")) return true;

  const noScheme = dbUrl.replace(/^[a-z]+:\/\//i, "");
  const authPlusHost = (noScheme.split("/")[0] ?? noScheme).trim();
  const atCount = (authPlusHost.match(/@/g) || []).length;
  if (atCount > 1) return true;

  return false;
}

function inspectDatabaseUrl(dbUrlRaw: string) {
  const raw = String(dbUrlRaw || "").trim();
  if (!raw) return { ok: false, reason: "DATABASE_URL empty" };

  const noScheme = raw.replace(/^[a-z]+:\/\//i, "");
  const authPlusHost = (noScheme.split("/")[0] ?? noScheme).trim();
  const atCount = (authPlusHost.match(/@/g) || []).length;

  try {
    const u = new URL(raw);
    return {
      ok: true,
      protocol: u.protocol,
      host: u.hostname,
      port: u.port ? Number(u.port) : null,
      db: u.pathname?.startsWith("/") ? u.pathname.slice(1) : u.pathname,
      hasUser: Boolean(u.username),
      atCount,
      hasHash: raw.includes("#"),
    };
  } catch (e: any) {
    return {
      ok: false,
      reason: String(e?.message || e || "parse error"),
      atCount,
      hasHash: raw.includes("#"),
    };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const checkDb = url.searchParams.get("db") === "1";

  const dbUrl = process.env.DATABASE_URL || "";
  const hasDbUrl = Boolean(dbUrl);
  const hasJwt = Boolean(process.env.JWT_SECRET);
  const dbUrlInfo = hasDbUrl ? inspectDatabaseUrl(dbUrl) : null;

  const base = {
    ok: true,
    node: process.version,
    now: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV || "",
      hasDbUrl,
      hasJwt,
      dbUrlLooksUnencoded: hasDbUrl ? looksLikeUnencodedDatabaseUrl(dbUrl) : false,
      dbUrlInfo,
    },
  };

  if (!checkDb) return NextResponse.json(base);

  // DB check (opsional) — dibuat ringan dan aman jika prisma import gagal.
  const startedAt = Date.now();
  try {
    const { prisma } = await import("@/lib/prisma");
    const timeoutMs = 5000;

    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`DB timeout (${timeoutMs}ms)`)), timeoutMs)),
    ]);

    return NextResponse.json({
      ...base,
      db: { ok: true, ms: Date.now() - startedAt },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ...base,
        ok: false,
        db: { ok: false, ms: Date.now() - startedAt },
        error: String(err?.message || err || "DB error"),
      },
      { status: 500 }
    );
  }
}
