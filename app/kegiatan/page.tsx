import PageShell from "@/app/components/PageShell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DeleteActivityButton from "./[id]/DeleteActivity";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID").format(n || 0);
}

export default async function KegiatanPage({
  searchParams,
}: {
  searchParams: { tahun?: string; subbagId?: string };
}) {
  const sess = await getSession();
  const tahun = Number(searchParams.tahun || new Date().getFullYear());
  const isAdmin = sess?.role === "SUPER_ADMIN";
  const subbagId = isAdmin ? searchParams.subbagId || "" : sess?.subbagId || "";

  const subbags = isAdmin
    ? await prisma.subbag.findMany({ orderBy: { nama: "asc" } })
    : [];

  const where: any = { tahun };
  if (subbagId) where.subbagId = subbagId;
  if (!isAdmin) where.subbagId = sess?.subbagId;

  const rows = await prisma.activity.findMany({
    where,
    include: {
      subbag: true,

      budgetAccount: true,

      budgetUsages: {
        include: { budgetAllocation: { include: { budgetAccount: true } } },
      },

      evidences: true,

      budgetPlan: true,

      budgetPlanUsages: {
        include: {
          budgetPlanDetail: true,
          evidences: true,
        },
      },

      documentations: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageShell>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Kegiatan</h1>
          <p className="text-sm text-gray-600">Input & kelola kegiatan.</p>
        </div>

        <div className="ml-auto flex gap-2">
          <Link
            className="bg-[#FFA500] text-white rounded px-3 py-1.5 hover:bg-[#e69500]"
            href="/kegiatan/new"
          >
            + Tambah
          </Link>
        </div>
      </div>

      <form className="mt-4 flex gap-2 items-end" action="/kegiatan" method="get">
        <div>
          <label className="text-sm">Tahun</label>
          <input
            name="tahun"
            defaultValue={tahun}
            className="block w-28 border rounded px-2 py-1"
          />
        </div>

        {isAdmin && (
          <div>
            <label className="text-sm">Subbag</label>
            <select
              name="subbagId"
              defaultValue={subbagId}
              className="block w-48 border rounded px-2 py-1"
            >
              <option value="">(Semua)</option>
              {subbags.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          className="bg-[#FFA500] text-white rounded px-3 py-1.5 hover:bg-[#e69500]"
          type="submit"
        >
          Filter
        </button>
      </form>

      <div className="mt-5 overflow-x-auto bg-white rounded-xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Nama Kegiatan</th>
              <th className="text-left p-3">Subbag</th>
              <th className="text-left p-3">Lokus</th>
              <th className="text-left p-3">Pagu Kegiatan</th>
              <th className="text-right p-3">Realisasi</th>
              <th className="text-left p-3">Akun</th>
              <th className="text-center p-3">Dokumentasi</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const hasPlanUsages = (r as any).budgetPlanUsages?.length > 0;
              const planUsages = (r as any).budgetPlanUsages || [];
              const legacyUsages = (r as any).budgetUsages || [];
              const legacyEvidenceCount = ((r as any).evidences || []).length;
              const docCount = ((r as any).documentations || []).length;

              // const evidenceCount = hasPlanUsages
              //   ? planUsages.reduce(
              //       (s: number, u: any) => s + (u.evidences?.length || 0),
              //       0
              //     )
              //   : legacyEvidenceCount;

              const realisasi = hasPlanUsages
                ? planUsages.reduce(
                    (sum: number, u: any) => sum + Number(u.amountUsed || 0),
                    0
                  )
                : legacyUsages.length > 0
                ? legacyUsages.reduce(
                    (sum: number, u: any) => sum + Number(u.amountUsed || 0),
                    0
                  )
                : Number((r as any).realisasiAnggaran || 0);

              return (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-3 font-medium">{r.namaKegiatan}</td>
                  <td className="p-3">{r.subbag?.nama || "-"}</td>
                  <td className="p-3">{r.lokus}</td>

                  <td className="p-3">
                    {r.budgetPlan ? (
                      <div className="text-xs">
                        <div className="font-medium">{(r.budgetPlan as any).nama}</div>
                        <div className="text-gray-500">Tahun {tahun}</div>
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>

                  <td className="p-3 text-right">Rp {rupiah(realisasi)}</td>

                  <td className="p-3">
                    {hasPlanUsages ? (
                      <div className="space-y-1">
                        {planUsages.map((u: any) => (
                          <div key={u.id} className="text-xs">
                            {u.budgetPlanDetail?.akun || "-"}{" "}
                            <span className="text-gray-500">
                              Rp {rupiah(u.amountUsed)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : legacyUsages.length ? (
                      <div className="space-y-1">
                        {legacyUsages.map((u: any) => (
                          <div key={u.id} className="text-xs">
                            {u.budgetAllocation?.budgetAccount?.kodeAkun || "-"}{" "}
                            <span className="text-gray-500">
                              Rp {rupiah(u.amountUsed)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span>
                        {(r as any).budgetAccount
                          ? (r as any).budgetAccount.kodeAkun
                          : "-"}
                      </span>
                    )}
                  </td>

                  <td className="p-3">
                    <span className="text-sm">{docCount} file</span>
                  </td>

                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Link
                        href={`/kegiatan/${r.id}`}
                        className="border rounded-lg divide-y"
                        title="Lihat Detail"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </Link>

                      <DeleteActivityButton id={r.id} />
                    </div>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-gray-600">
                  Belum ada kegiatan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}