import PageShell from "@/app/components/PageShell";
import { getSession } from "@/lib/auth";
import KinerjaRecapClient from "./KinerjaRecapClient";

export default async function KinerjaPage({
  searchParams,
}: {
  searchParams: { tahun?: string; subbagId?: string } | Promise<{ tahun?: string; subbagId?: string }>;
}) {
  const sp = await Promise.resolve(searchParams);
  const sess = await getSession();
  const tahun = Number(sp.tahun || new Date().getFullYear());
  const subbagId = sess?.role === "SUPER_ADMIN" ? (sp.subbagId || "") : (sess?.subbagId || "");

  return (
    <PageShell>
      <KinerjaRecapClient initialTahun={tahun} initialSubbagId={subbagId || undefined} />
    </PageShell>
  );
}
