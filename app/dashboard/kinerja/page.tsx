import PageShell from "@/app/components/PageShell";
import { getSession } from "@/lib/auth";
import KinerjaRecapClient from "./KinerjaRecapClient";

export default async function KinerjaPage({ searchParams }: { searchParams: { tahun?: string; subbagId?: string } }) {
  const sess = await getSession();
  const tahun = Number(searchParams.tahun || new Date().getFullYear());
  const subbagId = sess?.role === "SUPER_ADMIN" ? (searchParams.subbagId || "") : (sess?.subbagId || "");

  return (
    <PageShell>
      <KinerjaRecapClient initialTahun={tahun} initialSubbagId={subbagId || undefined} />
    </PageShell>
  );
}
