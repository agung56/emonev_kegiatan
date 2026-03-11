"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/app/components/ToastContext";
import { formatApiError, normalizeErrorMessage } from "@/lib/formatApiError";

type Goal = { id: string; nama: string };
type Indicator = { id: string; nama: string; strategicGoalId: string };

type BudgetPlan = { id: string; nama: string; tahun: number; totalPagu: number };
type BudgetPlanDetail = { id: string; akun: string; pagu: number };

type UsageForm = {
  budgetPlanDetailId: string;
  akun: string;
  pagu: number;
  amountUsed: number;
  evidenceFiles: File[];
};

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function parseNumber(s: string) {
  const x = String(s || "").replace(/[^\d]/g, "");
  return x ? Number(x) : 0;
}

async function fetchJsonSafe(url: string) {
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data, text };
}

export default function NewKegiatanPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [inds, setInds] = useState<Indicator[]>([]);

  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [kepemilikan, setKep] = useState<"LEMBAGA" | "SEKRETARIAT">("LEMBAGA");

  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);

  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>([]);
  const [budgetPlanId, setBudgetPlanId] = useState<string>("");
  const [planDetails, setPlanDetails] = useState<BudgetPlanDetail[]>([]);
  const [usages, setUsages] = useState<UsageForm[]>([]);

  const [documentationFiles, setDocumentationFiles] = useState<File[]>([]);

  const MAX_FILE_SIZE = 2 * 1024 * 1024;

  function validateDocumentationFiles(files: File[]) {
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx"];

    for (const file of files) {
      const lower = file.name.toLowerCase();
      const validExt = allowedExt.some((ext) => lower.endsWith(ext));

      if (!validExt) {
        return `Format file tidak didukung: ${file.name}`;
      }

      if (file.size > MAX_FILE_SIZE) {
        return `Ukuran file maksimal 2 MB per file: ${file.name}`;
      }
    }

    return "";
  }

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const totalUsed = useMemo(
    () => usages.reduce((s, u) => s + (u.amountUsed || 0), 0),
    [usages]
  );

  const filteredIndicators = useMemo(() => {
    if (!selectedGoalId) return [];
    return inds.filter((i) => i.strategicGoalId === selectedGoalId);
  }, [inds, selectedGoalId]);

  useEffect(() => {
    fetch(`/api/strategic-goals?tahun=${tahun}&kepemilikan=${kepemilikan}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : rows?.items || [];
        setGoals(list.map((x: any) => ({ id: x.id, nama: x.nama })));
      })
      .catch(() => setGoals([]));

    fetch(`/api/indicators?tahun=${tahun}&kepemilikan=${kepemilikan}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : rows?.indicators || rows?.items || [];
        setInds(
          list.map((x: any) => ({
            id: x.id,
            nama: x.nama,
            strategicGoalId: x.strategicGoalId,
          }))
        );
      })
      .catch(() => setInds([]));

    fetch(`/api/budget-plans?tahun=${tahun}`, {
      cache: "no-store",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data?.items) ? data.items : [];
        setBudgetPlans(list);
      })
      .catch(() => setBudgetPlans([]));

    setSelectedGoalId("");
    setSelectedIndicators([]);
    setBudgetPlanId("");
    setPlanDetails([]);
    setUsages([]);
  }, [tahun, kepemilikan]);

  function setUsage(idx: number, patch: Partial<UsageForm>) {
    setUsages((prev) => prev.map((u, i) => (i === idx ? { ...u, ...patch } : u)));
  }

  async function onSelectPlan(id: string) {
    setBudgetPlanId(id);
    setPlanDetails([]);
    setUsages([]);
    setErr("");

    if (!id) return;

    const r = await fetchJsonSafe(`/api/budget-plans/${id}`);
    if (!r.ok) {
      const msg = `Gagal memuat detail pagu kegiatan. (${r.status})`;
      setErr(msg);
      toast(msg, "error");
      return;
    }

    const details: BudgetPlanDetail[] =
      (Array.isArray(r.data?.item?.details) ? r.data.item.details : []) ||
      (Array.isArray(r.data?.details) ? r.data.details : []);

    setPlanDetails(details);
    setUsages(
      details.map((d) => ({
        budgetPlanDetailId: d.id,
        akun: d.akun,
        pagu: Number(d.pagu || 0),
        amountUsed: 0,
        evidenceFiles: [],
      }))
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setErr("");

    try {
      const fd = new FormData(e.currentTarget);
      const tanggalMulai = String(fd.get("tanggalMulai") || "");
      const tanggalSelesai = String(fd.get("tanggalSelesai") || "");

      if (!tanggalMulai) {
        throw new Error("Tanggal mulai kegiatan wajib diisi.");
      }

      if (!tanggalSelesai) {
        throw new Error("Tanggal selesai kegiatan wajib diisi.");
      }

      if (tanggalSelesai < tanggalMulai) {
        throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      }

      if (!selectedGoalId) {
        throw new Error("Sasaran kegiatan wajib dipilih.");
      }

      const payload: any = {
        tahun: Number(fd.get("tahun")),
        kepemilikan,
        namaKegiatan: String(fd.get("namaKegiatan") || ""),
        lokus: String(fd.get("lokus") || ""),
        tanggalMulai,
        tanggalSelesai,
        strategicGoalId: selectedGoalId,
        targetKinerja: String(fd.get("targetKinerja") || "-"),
        capaianKinerja: String(fd.get("capaianKinerja") || "-"),
        kendala: String(fd.get("kendala") || ""),
        outputKegiatan: String(fd.get("outputKegiatan") || ""),
        indicatorIds: selectedIndicators,
        budgetPlanId: budgetPlanId || null,
        budgetPlanUsages: usages
          .map((u) => ({
            budgetPlanDetailId: u.budgetPlanDetailId,
            amountUsed: Number(u.amountUsed || 0),
          }))
          .filter((u) => u.amountUsed > 0),
      };

      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const created = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = created?.error
          ? formatApiError(created.error)
          : created?.message || "Gagal simpan. Cek input.";
        throw new Error(msg);
      }

      const activity = created?.item ?? created;
      const activityId: string = activity?.id;
      if (!activityId) throw new Error("Create sukses tapi activityId tidak ditemukan.");

      const usageMap = new Map<string, string>();
      const createdUsages = activity?.budgetPlanUsages ?? created?.item?.budgetPlanUsages ?? [];
      for (const u of createdUsages) {
        if (u?.budgetPlanDetailId && u?.id) usageMap.set(u.budgetPlanDetailId, u.id);
      }

      for (const u of usages) {
        if (!u.evidenceFiles?.length) continue;

        const usageId = usageMap.get(u.budgetPlanDetailId);
        if (!usageId) continue;

        for (const file of u.evidenceFiles) {
          const fdata = new FormData();
          fdata.append("file", file);

          const up = await fetch(
            `/api/activities/${activityId}/budget-plan-usages/${usageId}/evidences`,
            {
              method: "POST",
              body: fdata,
              credentials: "include",
            }
          );

          if (!up.ok) {
            console.warn("Upload evidence gagal", await up.text());
          }
        }
      }

      const docError = validateDocumentationFiles(documentationFiles);
      if (docError) {
        throw new Error(docError);
      }

      if (documentationFiles.length > 0) {
        const fdata = new FormData();

        for (const file of documentationFiles) {
          fdata.append("files", file);
        }

        const up = await fetch(`/api/activities/${activityId}/documentation`, {
          method: "POST",
          body: fdata,
          credentials: "include",
        });

        if (!up.ok) {
          const txt = await up.text();
          throw new Error(txt || "Upload dokumentasi gagal");
        }
      }

      router.push("/kegiatan");
    } catch (e: any) {
      const msg = normalizeErrorMessage(e);
      setErr(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
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
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Tambah Kegiatan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Buat kegiatan baru beserta indikator dan realisasi anggaran.
          </p>
        </div>
      </div>

      {/* notif error tampil sebagai toast di atas */}

      <form onSubmit={onSubmit} className="mt-6 bg-card rounded-2xl shadow-sm border border-border p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Tahun</label>
              <input
                name="tahun"
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value))}
                className="mt-1 w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Kepemilikan (untuk filter indikator)</label>
              <select
                value={kepemilikan}
                onChange={(e) => setKep(e.target.value as any)}
                className="mt-1 w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer font-bold"
              >
                <option value="LEMBAGA" className="bg-card text-foreground">Lembaga</option>
                <option value="SEKRETARIAT" className="bg-card text-foreground">Sekretariat</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Pagu Anggaran Kegiatan</label>
            <select
              value={budgetPlanId}
              onChange={(e) => onSelectPlan(e.target.value)}
              className="mt-1 w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
            >
              <option value="" className="bg-card text-foreground">-- Pilih Pagu Anggaran Kegiatan --</option>
              {budgetPlans.map((p) => (
                <option key={p.id} value={p.id} className="bg-card text-foreground">
                  {p.nama} — Total {rupiah(p.totalPagu || 0)}
                </option>
              ))}
            </select>
            <div className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-widest">
              Pilih ini agar akun anggaran otomatis muncul per kegiatan.
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Nama Kegiatan</label>
            <input
              name="namaKegiatan"
              className="mt-1 w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Lokus</label>
            <input
              name="lokus"
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
                className="mt-1 w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Tanggal Selesai Kegiatan</label>
              <input
                type="date"
                name="tanggalSelesai"
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
                setSelectedIndicators([]);
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

          <input type="hidden" name="targetKinerja" value="-" />
          <input type="hidden" name="capaianKinerja" value="-" />

          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Indikator Kinerja yang mendukung (multi)</label>
            <div className="mt-2 max-h-48 overflow-auto border border-border bg-muted/30 rounded-xl p-3 space-y-2 text-sm">
              {!selectedGoalId ? (
                <div className="text-muted-foreground italic">
                  Pilih sasaran kegiatan terlebih dahulu.
                </div>
              ) : filteredIndicators.length === 0 ? (
                <div className="text-muted-foreground italic">
                  Tidak ada indikator yang terkait dengan sasaran ini.
                </div>
              ) : (
                filteredIndicators.map((i) => (
                  <label key={i.id} className="flex gap-3 items-start p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      className="mt-1 cursor-pointer"
                      checked={selectedIndicators.includes(i.id)}
                      onChange={(e) => {
                        setSelectedIndicators((prev) =>
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

          {budgetPlanId ? (
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="px-4 py-3 bg-muted/50 text-[10px] text-foreground font-bold uppercase tracking-widest border-b border-border">
                Anggaran per Akun (mengacu Pagu Kegiatan)
              </div>
              <div className="overflow-auto max-w-full">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/20 border-b border-border">
                    <tr className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest text-left">
                      <th className="p-4">Akun</th>
                      <th className="p-4 w-[160px] text-right">Pagu</th>
                      <th className="p-4 w-[210px] text-right">Anggaran Dikeluarkan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usages.map((u, idx) => (
                      <tr key={u.budgetPlanDetailId} className="align-top hover:bg-muted/10 transition-colors">
                        <td className="p-4 text-foreground font-medium">{u.akun}</td>
                        <td className="p-4 text-right text-muted-foreground font-semibold">{rupiah(u.pagu)}</td>
                        <td className="p-4 text-right">
                          <input
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-right font-bold text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            value={String(u.amountUsed || 0)}
                            onChange={(e) => {
                              const v = parseNumber(e.target.value);
                              setUsage(idx, { amountUsed: v });
                            }}
                            placeholder="0"
                          />
                          <div className="text-[10px] text-primary font-bold mt-2 uppercase tracking-widest">
                            Sisa akun: {rupiah((u.pagu || 0) - (u.amountUsed || 0))}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {usages.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-muted-foreground italic font-medium">
                          Detail akun belum tersedia.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 bg-muted/10 border-t border-border text-sm flex items-center justify-between">
                <span className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Total pengeluaran (dari akun):</span>
                <b className="text-primary">{rupiah(totalUsed)}</b>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-muted/30 border border-border text-sm text-foreground italic rounded-xl font-medium">
              * Pilih <b>Pagu Anggaran Kegiatan</b> jika kegiatan ini menggunakan akun/pagu yang sudah disusun.
            </div>
          )}

          <div className="pt-2">
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Output/Keluaran Kegiatan</label>
            <textarea
              name="outputKegiatan"
              className="mt-1 w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-y"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Dokumentasi Kegiatan</label>
            <input
              className="mt-1 block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setDocumentationFiles(Array.from(e.target.files || []))}
            />
            {documentationFiles.length > 0 && (
              <div className="mt-3 text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-xl border border-border">
                {documentationFiles.map((f) => (
                  <div key={f.name} className="flex justify-between items-center">
                    <span className="font-semibold text-foreground truncate">{f.name}</span>
                    <span className="text-muted-foreground ml-2">
                      ({Math.ceil(f.size / 1024)} KB)
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 text-xs font-medium text-muted-foreground italic">
              Bisa unggah lebih dari satu file. Maksimal 2 MB per file. Format: foto, PDF, Word, Excel.
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest text-[10px] mb-1.5 block">Kendala</label>
            <textarea
              name="kendala"
              className="mt-1 w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-y"
              rows={3}
            />
          </div>

          <div className="pt-6 border-t border-border mt-4">
            <button
              className="w-full bg-primary text-primary-foreground font-bold rounded-xl px-6 py-3 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
              type="submit"
              disabled={saving}
            >
              {saving ? "Menyimpan Kegiatan..." : "Simpan Kegiatan Baru"}
            </button>
          </div>
        </form>
    </div>
  );
}
