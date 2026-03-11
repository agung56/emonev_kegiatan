import PageShell from "@/app/components/PageShell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatSubbagName } from "@/lib/formatSubbag";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
  params: { id?: string } | Promise<{ id?: string }>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const { id } = await Promise.resolve(params);
  if (!id) notFound();

  const row = await prisma.activity.findUnique({
    where: { id },
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
    <PageShell showNav={false}>
      <div className="sticky top-16 z-40 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Link
            prefetch={false}
            href="/kegiatan"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-extrabold text-primary transition-all hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[0.98]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Kembali
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Detail Kegiatan</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Lihat rincian kegiatan, indikator, realisasi anggaran, dan dokumentasi.
            </p>
          </div>
        </div>

        <Link
          href={`/kegiatan/${row.id}/edit`}
          className="bg-primary text-primary-foreground font-bold rounded-xl px-4 py-2 hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all"
        >
          Edit Kegiatan
        </Link>
        </div>
      </div>

      <div className="mt-6 bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
        <div>
          <h2 className="font-bold text-lg text-foreground">{row.namaKegiatan}</h2>
          <div className="text-sm text-muted-foreground mt-1 font-medium">
            Tahun {row.tahun} {" • "} {formatSubbagName(row.subbag?.nama)}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 text-sm bg-muted/30 p-4 rounded-xl border border-border">
          <div>
            <div className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mb-1">Lokus</div>
            <div className="font-semibold text-foreground">{row.lokus}</div>
          </div>

          <div>
            <div className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mb-1">Realisasi Total</div>
            <div className="font-bold text-foreground">
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
            <div className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mb-1">Tanggal Kegiatan</div>
            <div className="font-semibold text-foreground">
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
            <h3 className="font-bold text-foreground mb-1">Pagu Anggaran Kegiatan</h3>
            <div className="text-sm font-semibold text-primary mb-3 bg-primary/10 inline-flex px-3 py-1 rounded-lg border border-primary/20">{row.budgetPlan?.nama}</div>

            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr className="text-muted-foreground uppercase tracking-wider text-[10px] font-bold">
                    <th className="p-4 text-left">Akun</th>
                    <th className="p-4 text-right">Total Anggaran</th>
                    <th className="p-4 text-right">Dipakai Kegiatan Ini</th>
                    <th className="p-4 text-right">Total Pengeluaran</th>
                    <th className="p-4 text-right">Sisa Anggaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
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
                        <tr key={detail.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4 font-semibold text-foreground">{detail.akun}</td>
                          <td className="p-4 text-right text-muted-foreground">{rupiah(pagu)}</td>
                          <td className="p-4 text-right text-foreground font-bold">
                            {rupiah(usedThisActivity)}
                          </td>
                          <td className="p-4 text-right text-muted-foreground">
                            {rupiah(usedGlobal)}
                          </td>
                          <td className="p-4 text-right text-primary font-bold">
                            {rupiah(sisaGlobal)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground italic font-medium">
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
          <h3 className="font-bold text-foreground mb-3">Dokumentasi Kegiatan</h3>

          <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
            {(row.documentations || []).map((doc: any) => {
              const path = String(doc.filePath || doc.storageKey || "");
              const name = doc.fileName || path.split("/").pop() || "file";
              const safeUrlName = encodeURIComponent(String(name).replace(/\s+/g, "-"));
              const previewHref = `/files/docs/${doc.id}/${safeUrlName}`;
              const downloadHref = `${previewHref}?download=1`;

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
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-widest bg-muted px-2 py-1 rounded text-foreground border border-border shrink-0">
                      {type}
                    </div>
                    <div className="truncate font-medium text-foreground">{name}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={previewHref}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                      title="Preview file"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </a>

                    <a
                      href={downloadHref}
                      download={name}
                      className="p-2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                      title="Download file"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
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
              <div className="p-6 text-center text-sm text-muted-foreground italic font-medium">
                Belum ada dokumentasi.
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <div className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mb-2">Output Kegiatan</div>
          <div className="text-sm whitespace-pre-line text-foreground p-4 bg-muted/30 rounded-xl border border-border">
            {row.outputKegiatan || "-"}
          </div>
        </div>

        <div>
          <div className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mb-2">Kendala</div>
          <div className="text-sm whitespace-pre-line text-foreground p-4 bg-muted/30 rounded-xl border border-border">
            {row.kendala || "-"}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
