import PageShell from "@/app/components/PageShell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

export default async function DashboardPage({ searchParams }: { searchParams: { tahun?: string; subbagId?: string } }) {
  const sess = await getSession();
  const tahun = Number(searchParams.tahun || new Date().getFullYear());
  const isAdmin = sess?.role === "SUPER_ADMIN";
  const subbagId = isAdmin ? (searchParams.subbagId || "") : (sess?.subbagId || "");

  const subbags = isAdmin ? await prisma.subbag.findMany({ orderBy: { nama: "asc" } }) : [];
  const where: any = { tahun };
  if (subbagId) where.subbagId = subbagId;

  const activities = await prisma.activity.findMany({
    where,
    include: { evidences: true, subbag: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageShell>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Dashboard Rekap Kegiatan</h1>
          <p className="text-sm text-gray-600">Rekap Kegiatan Per Subbagian dan Tahun.</p>
        </div>
        <div className="ml-auto flex gap-3 items-end flex-wrap">
          {/* <Link
            className="h-9 px-3 rounded border bg-white hover:bg-gray-50 flex items-center justify-center"
            href={`/dashboard/kinerja?tahun=${tahun}${subbagId ? `&subbagId=${subbagId}` : ""}`}
          >
            Rekap Capaian Kinerja
          </Link> */}

          <form className="flex gap-2 items-end" action="/dashboard" method="get">
          <div>
            <label className="text-sm">Tahun</label>
            <input name="tahun" defaultValue={tahun} className="block w-28 border rounded px-2 py-1" />
          </div>
          {isAdmin && (
            <div>
              <label className="text-sm">Subbag</label>
              <select name="subbagId" defaultValue={subbagId} className="block w-48 border rounded px-2 py-1">
                <option value="">(Semua)</option>
                {subbags.map((s) => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            </div>
          )}
          <button className="bg-[#FFA500] text-white rounded px-3 py-1.5 hover:bg-[#e69500]" type="submit">Filter</button>
          </form>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto bg-white rounded-xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Kegiatan</th>
              <th className="text-left p-3">Subbag</th>
              <th className="text-left p-3">Lokus</th>
              <th className="text-right p-3">Realisasi</th>
              <th className="text-left p-3">Output</th>
              <th className="text-left p-3">Kendala</th>
              {/* <th className="text-center p-3">Bukti</th> */}
              {/* <th className="text-center p-3">Aksi</th> */}
            </tr>
          </thead>
          <tbody>
            {activities.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-3 font-medium">{a.namaKegiatan}</td>
                <td className="p-3">{a.subbag.nama}</td>
                <td className="p-3">{a.lokus}</td>
                <td className="p-3 text-right">Rp {rupiah(a.realisasiAnggaran)}</td>
                <td className="p-3 max-w-xs truncate" title={a.outputKegiatan}>{a.outputKegiatan}</td>
                <td className="p-3 max-w-xs truncate" title={a.kendala}>{a.kendala}</td>
                {/* <td className="p-3 text-center">{a.evidences.length}</td> */}
                {/* <td className="p-3 text-center">
                  <a className="underline" href={`/kegiatan/${a.id}/edit`}>Edit/Upload</a>
                </td> */}
              </tr>
            ))}
            {activities.length === 0 && (
              <tr><td className="p-4 text-gray-600" colSpan={8}>Belum ada data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
