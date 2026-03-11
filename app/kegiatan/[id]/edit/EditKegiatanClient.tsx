"use client";
// Client component

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/app/components/ToastContext";
import { normalizeErrorMessage } from "@/lib/formatApiError";
// import { ActivityBudgetDetailTable } from "./ActivityBudgetDetailTable";
import DeleteDocumentationButton from "../DeleteActivityButton";

type Goal = { id: string; nama: string };
type Indicator = { id: string; nama: string; strategicGoalId: string };

function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID").format(n || 0);
}

export default function EditKegiatanClient({ activityId }: { activityId: string }) {
  const id = activityId;
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [inds, setInds] = useState<Indicator[]>([]);

  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [lokus, setLokus] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [outputKegiatan, setOutputKegiatan] = useState("");
  const [kendala, setKendala] = useState("");

  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [kepemilikan, setKepemilikan] = useState<"LEMBAGA" | "SEKRETARIAT">("LEMBAGA");

  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [indicatorIds, setIndicatorIds] = useState<string[]>([]);

  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const [draftBudgetPlanAmounts, setDraftBudgetPlanAmounts] = useState<Record<string, number>>({});

  const MAX_FILE_SIZE = 2 * 1024 * 1024;

  const filteredIndicators = useMemo(() => {
    if (!selectedGoalId) return [];
    return inds.filter((i) => i.strategicGoalId === selectedGoalId);
  }, [inds, selectedGoalId]);

  function validateDocFiles(files: File[]) {
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx"];

    for (const file of files) {
      const lower = file.name.toLowerCase();
      const validExt = allowedExt.some((ext) => lower.endsWith(ext));

      if (!validExt) return `Format file tidak didukung: ${file.name}`;
      if (file.size > MAX_FILE_SIZE) return `Ukuran file maksimal 2 MB per file: ${file.name}`;
    }

    return "";
  }

  async function loadMaster(existingTahun?: number, existingKepemilikan?: "LEMBAGA" | "SEKRETARIAT") {
    const t = existingTahun ?? tahun;
    const k = existingKepemilikan ?? kepemilikan;

    try {
      const [goalsRes, indsRes] = await Promise.all([
        fetch(`/api/strategic-goals?tahun=${t}&kepemilikan=${k}`, {
          cache: "no-store",
          credentials: "include",
        }),
        fetch(`/api/indicators?tahun=${t}&kepemilikan=${k}`, {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      const goalsData = await goalsRes.json().catch(() => []);
      const indsData = await indsRes.json().catch(() => []);

      const goalsList = Array.isArray(goalsData) ? goalsData : goalsData?.items || [];
      const indsList = Array.isArray(indsData)
        ? indsData
        : indsData?.indicators || indsData?.items || [];

      setGoals(goalsList.map((x: any) => ({ id: x.id, nama: x.nama })));
      setInds(
        indsList.map((x: any) => ({
          id: x.id,
          nama: x.nama,
          strategicGoalId: x.strategicGoalId,
        }))
      );
    } catch {
      setGoals([]);
      setInds([]);
    }
  }

  async function load() {
    if (!id) return;
    setErr("");

    try {
      const res = await fetch(`/api/activities/${id}`, {
        cache: "no-store",
        credentials: "include",
      });

      const d = await res.json().catch(() => ({}));
      const item = d?.item ?? d;

      if (!res.ok || d?.error || !item?.id) {
        throw new Error(d?.message || "Gagal memuat kegiatan");
      }

      setData(item);

      setNamaKegiatan(item.namaKegiatan || "");
      setLokus(item.lokus || "");
      setTanggalMulai(toDateInputValue(item.tanggalMulai));
      setTanggalSelesai(toDateInputValue(item.tanggalSelesai));
      setOutputKegiatan(item.outputKegiatan || "");
      setKendala(item.kendala || "");

      const itemTahun = Number(item.tahun || new Date().getFullYear());
      const itemKepemilikan =
        item.kepemilikan === "SEKRETARIAT" ? "SEKRETARIAT" : "LEMBAGA";

      setTahun(itemTahun);
      setKepemilikan(itemKepemilikan);

      setSelectedGoalId(item?.strategicGoals?.[0]?.goalId || "");
      setIndicatorIds((item.indicators || []).map((x: any) => x.indicatorId));

      const nextDrafts: Record<string, number> = {};
      for (const usage of item?.budgetPlanUsages || []) {
        nextDrafts[usage.budgetPlanDetailId] = Number(usage.amountUsed || 0);
      }
      setDraftBudgetPlanAmounts(nextDrafts);

      await loadMaster(itemTahun, itemKepemilikan);
    } catch (e: any) {
      const msg = normalizeErrorMessage(e);
      setErr(msg);
      toast(msg, "error");
      setData(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function uploadDocumentation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id || uploadingDocs || docFiles.length === 0) return;

    const error = validateDocFiles(docFiles);
    if (error) {
      alert(error);
      return;
    }

    try {
      setUploadingDocs(true);

      const fd = new FormData();
      for (const file of docFiles) {
        fd.append("files", file);
      }

      const res = await fetch(`/api/activities/${id}/documentation`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(out?.message || "Gagal upload dokumentasi");
        return;
      }

      setDocFiles([]);
      await load();
      router.refresh();
      alert("Dokumentasi berhasil diunggah.");
    } finally {
      setUploadingDocs(false);
    }
  }

  async function saveBudgetPlanUsage(budgetPlanDetailId: string, amountUsed: number) {
    if (!id) return;

    const res = await fetch(`/api/activities/${id}/budget-plan-usages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        budgetPlanDetailId,
        amountUsed,
      }),
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(out?.error || out?.message || "Gagal menyimpan penggunaan anggaran.");
      await load();
      return;
    }

    await load();
    router.refresh();
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;

    if (!tanggalMulai) {
      alert("Tanggal mulai kegiatan wajib diisi.");
      return;
    }

    if (!tanggalSelesai) {
      alert("Tanggal selesai kegiatan wajib diisi.");
      return;
    }

    if (tanggalSelesai < tanggalMulai) {
      alert("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }

    if (!selectedGoalId) {
      alert("Sasaran kegiatan wajib dipilih.");
      return;
    }

    try {
      setSaving(true);

      const payload: any = {
        namaKegiatan,
        lokus,
        tanggalMulai,
        tanggalSelesai,
        targetKinerja: data?.targetKinerja || "-",
        capaianKinerja: data?.capaianKinerja || "-",
        kendala,
        outputKegiatan,
        strategicGoalId: selectedGoalId,
        indicatorIds,
      };

      const res = await fetch(`/api/activities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(out?.message || out?.error || "Gagal update");
        return;
      }

      await load();
      router.refresh();
      alert("Tersimpan.");
    } finally {
      setSaving(false);
    }
  }

  if (err) return <div className="text-destructive text-sm font-semibold">{err}</div>;
  if (!data) return <div className="text-sm text-muted-foreground font-medium">Memuat...</div>;

  return (
    <div>
      <div className="sticky top-16 z-40 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
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

          <div className="mt-2">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Edit Kegiatan</h1>
            <p className="text-sm text-muted-foreground mt-1">Perbarui data kegiatan, indikator, dan dokumentasi.</p>
          </div>
        </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl">
        <form onSubmit={onSave} className="mt-6 bg-card rounded-xl shadow border border-border p-6 space-y-6">
          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Nama Kegiatan</label>
            <input
              name="namaKegiatan"
              value={namaKegiatan}
              onChange={(e) => setNamaKegiatan(e.target.value)}
              className="mt-1 w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Lokus</label>
            <input
              name="lokus"
              value={lokus}
              onChange={(e) => setLokus(e.target.value)}
              className="mt-1 w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Tanggal Mulai Kegiatan</label>
              <input
                type="date"
                name="tanggalMulai"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                className="mt-1 w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Tanggal Selesai Kegiatan</label>
              <input
                type="date"
                name="tanggalSelesai"
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                className="mt-1 w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Sasaran Kegiatan</label>
            <select
              value={selectedGoalId}
              onChange={(e) => {
                setSelectedGoalId(e.target.value);
                setIndicatorIds([]);
              }}
              className="mt-1 w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
              required
            >
              <option value="" className="bg-card text-foreground">-- Pilih Sasaran Kegiatan --</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id} className="bg-card text-foreground">
                  {g.nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Indikator Kinerja yang mendukung (multi)</label>
            <div className="mt-2 max-h-48 overflow-auto border border-border bg-muted/30 rounded-xl p-3 space-y-2 text-sm">
              {!selectedGoalId ? (
                <div className="text-muted-foreground italic">Pilih sasaran kegiatan terlebih dahulu.</div>
              ) : filteredIndicators.length === 0 ? (
                <div className="text-muted-foreground italic">Tidak ada indikator yang terkait dengan sasaran ini.</div>
              ) : (
                filteredIndicators.map((i) => (
                  <label key={i.id} className="flex gap-3 items-start p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      className="mt-1 cursor-pointer"
                      checked={indicatorIds.includes(i.id)}
                      onChange={(e) => {
                        setIndicatorIds((prev) =>
                          e.target.checked
                            ? [...prev, i.id]
                            : prev.filter((x) => x !== i.id)
                        );
                      }}
                    />
                    <span className="font-medium text-foreground">{i.nama}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="pt-4">
            <div className="text-sm font-bold text-foreground">Pagu Anggaran Kegiatan</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">
              Menampilkan akun berdasarkan pagu kegiatan yang dipilih pada saat input kegiatan.
            </div>

            {!data?.budgetPlan ? (
              <div className="mt-3 p-4 bg-muted/30 border border-border rounded-xl text-sm text-muted-foreground italic font-medium">
                Kegiatan ini belum terhubung ke pagu anggaran kegiatan.
              </div>
            ) : (
              <div className="mt-4 border border-border rounded-xl overflow-hidden bg-card">
                <div className="px-4 py-3 bg-muted/50 border-b border-border flex justify-between items-center">
                  <div className="font-bold text-foreground text-sm uppercase tracking-widest">{data.budgetPlan.nama}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-2 py-1 rounded">
                    Total Pagu: Rp {rupiah(data.budgetPlan.totalPagu || 0)}
                  </div>
                </div>

                <div className="overflow-auto max-w-full">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/20 border-b border-border">
                      <tr className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                        <th className="p-3 text-left">Akun</th>
                        <th className="p-3 text-right">Pagu</th>
                        <th className="p-3 text-right">Dipakai</th>
                        <th className="p-3 text-right">Sisa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(data.budgetPlan.details || []).map((detail: any) => {
                        const usage = (data.budgetPlanUsages || []).find(
                          (u: any) => u.budgetPlanDetailId === detail.id
                        );

                        const pagu = Number(detail.pagu || 0);
                        const dipakai = Number(usage?.amountUsed || 0);
                        const draftValue = draftBudgetPlanAmounts[detail.id] ?? dipakai;
                        const sisa = pagu - draftValue;

                        return (
                          <tr key={detail.id} className="hover:bg-muted/10 transition-colors">
                            <td className="p-3 text-foreground font-medium">{detail.akun}</td>
                            <td className="p-3 text-right text-muted-foreground font-semibold">Rp {rupiah(pagu)}</td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                min={0}
                                value={draftValue}
                                className="w-40 border border-border bg-background rounded-lg px-3 py-1.5 text-right font-bold text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                onChange={(e) =>
                                  setDraftBudgetPlanAmounts((prev) => ({
                                    ...prev,
                                    [detail.id]: Number(e.target.value || 0),
                                  }))
                                }
                                onBlur={async () => {
                                  const value = Number(draftBudgetPlanAmounts[detail.id] ?? 0);
                                  if (value !== dipakai) {
                                    await saveBudgetPlanUsage(detail.id, value);
                                  }
                                }}
                              />
                            </td>
                            <td className="p-3 text-right text-primary font-bold">Rp {rupiah(sisa)}</td>
                          </tr>
                        );
                      })}

                      {(data.budgetPlan.details || []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-muted-foreground italic font-medium">
                            Detail akun pagu belum tersedia.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* <div className="pt-2">
            <div className="text-sm font-semibold">Rincian Anggaran (Format Dokumen)</div>
            <div className="mt-2">
              <ActivityBudgetDetailTable activityId={id} />
            </div>
          </div> */}

          <div className="pt-2">
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Output/Keluaran</label>
            <textarea
              name="outputKegiatan"
              value={outputKegiatan}
              onChange={(e) => setOutputKegiatan(e.target.value)}
              className="mt-1 w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-y"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Kendala</label>
            <textarea
              name="kendala"
              value={kendala}
              onChange={(e) => setKendala(e.target.value)}
              className="mt-1 w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-y"
              rows={3}
            />
          </div>

          <div className="pt-4 border-t border-border mt-6">
            <button
              className="w-full bg-primary text-primary-foreground font-bold rounded-xl px-6 py-3 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
              type="submit"
              disabled={saving}
            >
              {saving ? "Menyimpan Perubahan..." : "Simpan Perubahan Kegiatan"}
            </button>
          </div>
        </form>

        <div className="mt-8 bg-card rounded-xl shadow border border-border p-6 mb-8">
          <h2 className="font-bold text-lg text-foreground mb-4">Upload Dokumentasi</h2>

          <form onSubmit={uploadDocumentation} className="mt-3 space-y-4">
            <input
              type="file"
              multiple
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setDocFiles(Array.from(e.target.files || []))}
              required
            />

            {docFiles.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-xl border border-border">
                {docFiles.map((f) => (
                  <div key={f.name} className="flex justify-between items-center">
                    <span className="font-semibold text-foreground truncate">{f.name}</span>
                    <span className="text-muted-foreground ml-2">
                      ({Math.ceil(f.size / 1024)} KB)
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs font-medium text-muted-foreground italic">
              Bisa unggah lebih dari satu file. Maksimal 2 MB per file. Format: foto, PDF, Word, Excel.
            </div>

            <button
              className="bg-primary text-primary-foreground font-bold rounded-xl px-4 py-2 hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all text-sm disabled:opacity-50"
              type="submit"
              disabled={uploadingDocs}
            >
              {uploadingDocs ? "Mengunggah..." : "Upload Dokumentasi"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Dokumentasi terupload</div>

            <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
              {(data.documentations || []).map((doc: any) => {
                const path = String(doc.filePath || doc.storageKey || "");
                const name =
                  doc.fileName || path.split("/").pop() || "file";
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
                      <div className="text-[10px] font-black uppercase tracking-widest bg-muted px-2 py-1 rounded border border-border text-foreground shrink-0">
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
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </a>
                      <a
                        href={downloadHref}
                        download={name}
                        className="p-2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                        title="Download file"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 3v12" />
                          <polyline points="7 11 12 16 17 11" />
                          <path d="M5 21h14" />
                        </svg>
                      </a>

                      <DeleteDocumentationButton
                        activityId={id}
                        docId={doc.id}
                        fileName={name}
                      />
                    </div>
                  </div>
                );
              })}

              {(data.documentations || []).length === 0 && (
                <div className="p-6 text-sm text-center text-muted-foreground italic font-medium">
                  Belum ada dokumentasi.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
