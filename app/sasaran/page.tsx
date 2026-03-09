import PageShell from "@/app/components/PageShell";
import { prisma } from "@/lib/prisma";
import SasaranClient from "./SasaranClient";
import { getSession } from "@/lib/auth";

export default async function SasaranPage({ searchParams }: { searchParams: { tahun?: string; kepemilikan?: string } }) {
  const sess = await getSession();
  const tahun = Number(searchParams.tahun || new Date().getFullYear());
  const kepemilikan = (searchParams.kepemilikan || "LEMBAGA") as "LEMBAGA" | "SEKRETARIAT";

  // server-side initial fetch for fast first paint
  const goals = await prisma.strategicGoal.findMany({
    where: { tahun, kepemilikan },
    orderBy: { nama: "asc" },
  });

  const firstGoalId = goals[0]?.id;
  const indicators = firstGoalId
    ? await prisma.performanceIndicator.findMany({
        where: { tahun, kepemilikan, strategicGoalId: firstGoalId },
        orderBy: { nama: "asc" },
      })
    : [];

  const isAdmin = sess?.role === "SUPER_ADMIN";

  return (
    <PageShell>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Sasaran Kegiatan/program & Indikator Kinerja</h1>
        </div>
        {!isAdmin && (
          <div className="ml-auto bg-amber-50 text-amber-800 border border-amber-200 rounded px-3 py-2 text-sm">
            Anda bisa melihat data, tapi hanya Super Admin yang bisa mengubah.
          </div>
        )}
      </div>

      <SasaranClient initialTahun={tahun} initialKepemilikan={kepemilikan} goals={goals as any} indicators={indicators as any} />
    </PageShell>
  );
}
