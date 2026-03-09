import PageShell from "@/app/components/PageShell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteDocumentationButton from "./DeleteActivityButton";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export default async function KegiatanDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const sess = await getSession();
  if (!sess) notFound();

  const row = await prisma.activity.findUnique({
    where: { id: params.id },
    include: {
      subbag: true,
      indicators: { include: { indicator: true } },
      budgetAccount: true,
      budgetUsages: {
        include: {
          budgetAllocation: {
            include: { budgetAccount: true },
          },
        },
      },
      evidences: true,
      budgetPlan: {
        include: {
          details: true,
        },
      },
      budgetPlanUsages: {
        include: {
          budgetPlanDetail: true,
          evidences: true,
        },
      },
      documentations: true,
    },
  });

  if (!row) notFound();

  const hasPlan = !!row.budgetPlan;
  const hasPlanDetails = (row.budgetPlan?.details || []).length > 0;

  const detailIds = (row.budgetPlan?.details || []).map((d) => d.id);

  const globalUsageAgg =
    detailIds.length > 0
      ? await prisma.activityBudgetPlanUsage.groupBy({
          by: ["budgetPlanDetailId"],
          where: {
            budgetPlanDetailId: { in: detailIds },
          },
          _sum: {
            amountUsed: true,
          },
        })
      : [];

  const globalUsageMap = new Map<string, number>();
  for (const item of globalUsageAgg) {
    globalUsageMap.set(item.budgetPlanDetailId, item._sum.amountUsed ?? 0);
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/kegiatan" className="underline text-sm">
            ← Kembali
          </Link>
          <h1 className="text-xl font-semibold mt-2">Detail Kegiatan</h1>
        </div>

        <Link
          href={`/kegiatan/${row.id}/edit`}
          className="bg-[#FFA500] text-white rounded px-3 py-2 hover:bg-[#e69500]"
        >
          Edit
        </Link>
      </div>

      <div className="mt-5 bg-white rounded-xl shadow p-5 space-y-5">
        <div>
          <h2 className="font-semibold text-lg">{row.namaKegiatan}</h2>
          <div className="text-sm text-gray-600 mt-1">
            Tahun {row.tahun} • {row.subbag?.nama}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Lokus</div>
            <div>{row.lokus}</div>
          </div>

          <div>
            <div className="text-gray-500">Realisasi Total</div>
            <div className="font-medium">
              {rupiah(
                row.budgetPlanUsages?.length > 0
                  ? row.budgetPlanUsages.reduce(
                      (sum, u) => sum + Number(u.amountUsed || 0),
                      0
                    )
                  : row.realisasiAnggaran
              )}
            </div>
          </div>

          <div>
            <div className="text-gray-500">Tanggal Kegiatan</div>
            <div>
              {row.tanggalMulai
                ? new Date(row.tanggalMulai).toLocaleDateString("id-ID")
                : "-"}
              {" - "}
              {row.tanggalSelesai
                ? new Date(row.tanggalSelesai).toLocaleDateString("id-ID")
                : "-"}
            </div>
          </div>
        </div>

        {hasPlan && (
          <div>
            <h3 className="font-semibold mb-2">Pagu Anggaran Kegiatan</h3>
            <div className="text-sm text-gray-600 mb-2">{row.budgetPlan?.nama}</div>

            <div className="overflow-x-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left">Akun</th>
                    <th className="p-3 text-right">Pagu</th>
                    <th className="p-3 text-right">Dipakai Kegiatan Ini</th>
                    <th className="p-3 text-right">Dipakai Semua Kegiatan</th>
                    <th className="p-3 text-right">Sisa Global</th>
                  </tr>
                </thead>
                <tbody>
                  {hasPlanDetails ? (
                    row.budgetPlan!.details.map((detail) => {
                      const usageThisActivity = row.budgetPlanUsages.find(
                        (u) => u.budgetPlanDetailId === detail.id
                      );

                      const pagu = Number(detail.pagu || 0);
                      const usedThisActivity = Number(
                        usageThisActivity?.amountUsed || 0
                      );
                      const usedGlobal = Number(globalUsageMap.get(detail.id) || 0);
                      const sisaGlobal = pagu - usedGlobal;

                      return (
                        <tr key={detail.id} className="border-t">
                          <td className="p-3">{detail.akun}</td>
                          <td className="p-3 text-right">{rupiah(pagu)}</td>
                          <td className="p-3 text-right">
                            {rupiah(usedThisActivity)}
                          </td>
                          <td className="p-3 text-right">
                            {rupiah(usedGlobal)}
                          </td>
                          <td className="p-3 text-right">
                            {rupiah(sisaGlobal)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-3 text-gray-500">
                        Detail akun belum tersedia.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div>
          <h3 className="font-semibold mb-2">Dokumentasi Kegiatan</h3>

          <div className="border rounded-lg divide-y">
            {(row.documentations || []).map((doc: any) => {
              const path = String(doc.filePath || doc.storageKey || "");
              const name = doc.fileName || path.split("/").pop() || "file";

              const lower = path.toLowerCase();
              const isPdf = lower.endsWith(".pdf");
              const isWord = lower.endsWith(".doc") || lower.endsWith(".docx");
              const isExcel = lower.endsWith(".xls") || lower.endsWith(".xlsx");
              const isImage =
                lower.endsWith(".jpg") ||
                lower.endsWith(".jpeg") ||
                lower.endsWith(".png") ||
                lower.endsWith(".webp");

              const type = isPdf
                ? "PDF"
                : isWord
                ? "WORD"
                : isExcel
                ? "EXCEL"
                : isImage
                ? "IMAGE"
                : "FILE";

              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-xs font-semibold bg-gray-100 px-2 py-1 rounded shrink-0">
                      {type}
                    </div>
                    <div className="truncate">{name}</div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={path}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                      title="Preview file"
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
                    </a>

                    <a
                      href={path}
                      download
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                      title="Download file"
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
                        <path d="M12 3v12" />
                        <polyline points="7 11 12 16 17 11" />
                        <path d="M5 21h14" />
                      </svg>
                    </a>

                    <DeleteDocumentationButton
                      activityId={row.id}
                      docId={doc.id}
                      fileName={name}
                    />
                  </div>
                </div>
              );
            })}

            {(row.documentations || []).length === 0 && (
              <div className="p-3 text-sm text-gray-600">
                Belum ada dokumentasi.
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="text-gray-500 text-sm">Output Kegiatan</div>
          <div className="text-sm whitespace-pre-line">
            {row.outputKegiatan || "-"}
          </div>
        </div>

        <div>
          <div className="text-gray-500 text-sm">Kendala</div>
          <div className="text-sm whitespace-pre-line">
            {row.kendala || "-"}
          </div>
        </div>
      </div>
    </PageShell>
  );
}