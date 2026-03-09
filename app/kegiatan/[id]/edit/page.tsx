"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function EditKegiatanPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

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
      setErr(e?.message || "Error");
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

  if (err) return <div className="p-6 text-red-600 text-sm">{err}</div>;
  if (!id) return <div className="p-6">Invalid ID</div>;
  if (!data) return <div className="p-6">Memuat...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <a className="underline text-sm" href="/kegiatan">
          ← Kembali
        </a>
        <h1 className="text-xl font-semibold mt-2">Edit Kegiatan</h1>

        <form onSubmit={onSave} className="mt-4 bg-white rounded-xl shadow p-4 space-y-4">
          <div>
            <label className="text-sm">Nama Kegiatan</label>
            <input
              name="namaKegiatan"
              value={namaKegiatan}
              onChange={(e) => setNamaKegiatan(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="text-sm">Lokus</label>
            <input
              name="lokus"
              value={lokus}
              onChange={(e) => setLokus(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Tanggal Mulai Kegiatan</label>
              <input
                type="date"
                name="tanggalMulai"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="text-sm">Tanggal Selesai Kegiatan</label>
              <input
                type="date"
                name="tanggalSelesai"
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm">Sasaran Kegiatan</label>
            <select
              value={selectedGoalId}
              onChange={(e) => {
                setSelectedGoalId(e.target.value);
                setIndicatorIds([]);
              }}
              className="mt-1 w-full border rounded px-3 py-2"
              required
            >
              <option value="">-- Pilih Sasaran Kegiatan --</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm">Indikator Kinerja yang mendukung (multi)</label>
            <div className="mt-2 max-h-48 overflow-auto border rounded p-2 space-y-1 text-sm">
              {!selectedGoalId ? (
                <div className="text-gray-600">Pilih sasaran kegiatan terlebih dahulu.</div>
              ) : filteredIndicators.length === 0 ? (
                <div className="text-gray-600">Tidak ada indikator yang terkait dengan sasaran ini.</div>
              ) : (
                filteredIndicators.map((i) => (
                  <label key={i.id} className="flex gap-2 items-start">
                    <input
                      type="checkbox"
                      checked={indicatorIds.includes(i.id)}
                      onChange={(e) => {
                        setIndicatorIds((prev) =>
                          e.target.checked
                            ? [...prev, i.id]
                            : prev.filter((x) => x !== i.id)
                        );
                      }}
                    />
                    <span>{i.nama}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="pt-2">
            <div className="text-sm font-semibold">Pagu Anggaran Kegiatan</div>
            <div className="text-xs text-gray-500 mt-1">
              Menampilkan akun berdasarkan pagu kegiatan yang dipilih pada saat input kegiatan.
            </div>

            {!data?.budgetPlan ? (
              <div className="mt-2 text-sm text-gray-600">
                Kegiatan ini belum terhubung ke pagu anggaran kegiatan.
              </div>
            ) : (
              <div className="mt-3 border rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b">
                  <div className="font-medium">{data.budgetPlan.nama}</div>
                  <div className="text-xs text-gray-500">
                    Total Pagu: Rp {rupiah(data.budgetPlan.totalPagu || 0)}
                  </div>
                </div>

                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white border-b">
                      <tr>
                        <th className="p-3 text-left">Akun</th>
                        <th className="p-3 text-right">Pagu</th>
                        <th className="p-3 text-right">Dipakai</th>
                        <th className="p-3 text-right">Sisa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.budgetPlan.details || []).map((detail: any) => {
                        const usage = (data.budgetPlanUsages || []).find(
                          (u: any) => u.budgetPlanDetailId === detail.id
                        );

                        const pagu = Number(detail.pagu || 0);
                        const dipakai = Number(usage?.amountUsed || 0);
                        const draftValue = draftBudgetPlanAmounts[detail.id] ?? dipakai;
                        const sisa = pagu - draftValue;

                        return (
                          <tr key={detail.id} className="border-b">
                            <td className="p-3">{detail.akun}</td>
                            <td className="p-3 text-right">Rp {rupiah(pagu)}</td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                min={0}
                                value={draftValue}
                                className="w-40 border rounded px-2 py-1 text-right"
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
                            <td className="p-3 text-right">Rp {rupiah(sisa)}</td>
                          </tr>
                        );
                      })}

                      {(data.budgetPlan.details || []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-3 text-gray-600">
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

          <div>
            <label className="text-sm">Output/Keluaran</label>
            <textarea
              name="outputKegiatan"
              value={outputKegiatan}
              onChange={(e) => setOutputKegiatan(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm">Kendala</label>
            <textarea
              name="kendala"
              value={kendala}
              onChange={(e) => setKendala(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          <button
            className="bg-[#FFA500] text-white rounded px-3 py-1.5 hover:bg-[#e69500]"
            type="submit"
            disabled={saving}
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>

        <div className="mt-6 bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold">Upload Dokumentasi</h2>

          <form onSubmit={uploadDocumentation} className="mt-3 space-y-2">
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setDocFiles(Array.from(e.target.files || []))}
              required
            />

            {docFiles.length > 0 && (
              <div className="text-xs text-gray-600 space-y-1">
                {docFiles.map((f) => (
                  <div key={f.name}>
                    {f.name}{" "}
                    <span className="text-gray-500">
                      ({Math.ceil(f.size / 1024)} KB)
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-gray-500">
              Bisa unggah lebih dari satu file. Maksimal 2 MB per file. Format: foto, PDF, Word, Excel.
            </div>

            <button
              className="bg-[#FFA500] text-white rounded px-3 py-1.5 hover:bg-[#e69500]"
              type="submit"
              disabled={uploadingDocs}
            >
              {uploadingDocs ? "Mengunggah..." : "Upload Dokumentasi"}
            </button>
          </form>

          <div className="mt-4">
  <div className="text-sm text-gray-600 mb-2">Dokumentasi terupload:</div>

  <div className="border rounded-lg divide-y">
    {(data.documentations || []).map((doc: any) => {
      const path = String(doc.filePath || doc.storageKey || "");
      const name =
        doc.fileName || path.split("/").pop() || "file";

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
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </a>
            <a
              href={path}
              download
              className="text-blue-600 hover:text-blue-800"
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
              activityId={id}
              docId={doc.id}
              fileName={name}
            />
          </div>
          </div>
                );
              })}

              {(data.documentations || []).length === 0 && (
                <div className="p-3 text-sm text-gray-600">
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