import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow, requireRole } from "@/lib/auth";

const Schema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("day"),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    mode: z.literal("month"),
    month: z.string().regex(/^\d{4}-\d{2}$/),
  }),
]);

function toLocalDayRange(day: string) {
  const [y, m, d] = day.split("-").map((n) => Number(n));
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

function toLocalMonthRange(month: string) {
  const [y, m] = month.split("-").map((n) => Number(n));
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 1, 0, 0, 0, 0);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return { start, end };
}

export async function POST(req: Request) {
  const user = await getActiveUserOrThrow();
  requireRole(user, ["SUPER_ADMIN"]);

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const range =
    parsed.data.mode === "day"
      ? toLocalDayRange(parsed.data.day)
      : toLocalMonthRange(parsed.data.month);

  if (!range) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });

  const del = await prisma.activityLog.deleteMany({
    where: {
      createdAt: { gte: range.start, lt: range.end },
    },
  });

  return NextResponse.json({
    ok: true,
    deleted: del.count,
  });
}

