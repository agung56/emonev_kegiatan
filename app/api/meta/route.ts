import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserOrThrow } from "@/lib/auth";

export async function GET() {
  await getActiveUserOrThrow();
  const akun = await prisma.budgetAccount.findMany({ orderBy: { kodeAkun: "asc" } });
  const subbags = await prisma.subbag.findMany({ orderBy: { nama: "asc" } });
  return NextResponse.json({ akun, subbags });
}
