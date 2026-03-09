"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
      setErr(`Gagal memuat detail pagu kegiatan. (${r.status})`);
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
          ? JSON.stringify(created.error)
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
      setErr(e?.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <a className="underline text-sm" href="/kegiatan">
          ← Kembali
        </a>
        <h1 className="text-xl font-semibold mt-2">Tambah Kegiatan</h1>

        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

        <form onSubmit={onSubmit} className="mt-4 bg-white rounded-xl shadow p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Tahun</label>
              <input
                name="tahun"
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value))}
                className="mt-1 w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm">Kepemilikan (untuk filter indikator)</label>
              <select
                value={kepemilikan}
                onChange={(e) => setKep(e.target.value as any)}
                className="mt-1 w-full border rounded px-3 py-2"
              >
                <option value="LEMBAGA">Lembaga</option>
                <option value="SEKRETARIAT">Sekretariat</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm">Pagu Anggaran Kegiatan</label>
            <select
              value={budgetPlanId}
              onChange={(e) => onSelectPlan(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            >
              <option value="">-- Pilih Pagu Anggaran Kegiatan --</option>
              {budgetPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} — Total {rupiah(p.totalPagu || 0)}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              Pilih ini agar akun anggaran otomatis muncul per kegiatan.
            </div>
          </div>

          <div>
            <label className="text-sm">Nama Kegiatan</label>
            <input
              name="namaKegiatan"
              className="mt-1 w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="text-sm">Lokus</label>
            <input
              name="lokus"
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
                className="mt-1 w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="text-sm">Tanggal Selesai Kegiatan</label>
              <input
                type="date"
                name="tanggalSelesai"
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
                setSelectedIndicators([]);
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

          <input type="hidden" name="targetKinerja" value="-" />
          <input type="hidden" name="capaianKinerja" value="-" />

          <div>
            <label className="text-sm">Indikator Kinerja yang mendukung (multi)</label>
            <div className="mt-2 max-h-48 overflow-auto border rounded p-2 space-y-1 text-sm">
              {!selectedGoalId ? (
                <div className="text-gray-600">
                  Pilih sasaran kegiatan terlebih dahulu.
                </div>
              ) : filteredIndicators.length === 0 ? (
                <div className="text-gray-600">
                  Tidak ada indikator yang terkait dengan sasaran ini.
                </div>
              ) : (
                filteredIndicators.map((i) => (
                  <label key={i.id} className="flex gap-2 items-start">
                    <input
                      type="checkbox"
                      checked={selectedIndicators.includes(i.id)}
                      onChange={(e) => {
                        setSelectedIndicators((prev) =>
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

          {budgetPlanId ? (
            <div className="border rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 text-sm font-medium">
                Anggaran per Akun (mengacu Pagu Kegiatan)
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white">
                    <tr className="text-left border-b">
                      <th className="p-3">Akun</th>
                      <th className="p-3 w-[160px] text-right">Pagu</th>
                      <th className="p-3 w-[210px] text-right">Anggaran Dikeluarkan</th>
                      {/* <th className="p-3 w-[260px]">Bukti Dukung (PDF/Image)</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {usages.map((u, idx) => (
                      <tr key={u.budgetPlanDetailId} className="border-t align-top">
                        <td className="p-3">{u.akun}</td>
                        <td className="p-3 text-right">{rupiah(u.pagu)}</td>
                        <td className="p-3 text-right">
                          <input
                            className="w-full border rounded px-2 py-2 text-right"
                            value={String(u.amountUsed || 0)}
                            onChange={(e) => {
                              const v = parseNumber(e.target.value);
                              setUsage(idx, { amountUsed: v });
                            }}
                            placeholder="0"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            Sisa akun: {rupiah((u.pagu || 0) - (u.amountUsed || 0))}
                          </div>
                        </td>
                        {/* <td className="p-3">
                          <input
                            type="file"
                            multiple
                            accept="application/pdf,image/png,image/jpeg,image/webp"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              setUsage(idx, { evidenceFiles: files });
                            }}
                          />
                          {u.evidenceFiles.length > 0 && (
                            <div className="mt-2 text-xs text-gray-600">
                              {u.evidenceFiles.map((f) => (
                                <div key={f.name}>{f.name}</div>
                              ))}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Catatan: bukti dukung akan ditautkan ke akun ini.
                          </div>
                        </td> */}
                      </tr>
                    ))}
                    {usages.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-3 text-gray-600">
                          Detail akun belum tersedia.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-3 py-2 border-t text-sm flex items-center justify-between">
                <span className="text-gray-600">Total pengeluaran (dari akun):</span>
                <b>{rupiah(totalUsed)}</b>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              * Pilih <b>Pagu Anggaran Kegiatan</b> jika kegiatan ini menggunakan akun/pagu yang sudah disusun.
            </div>
          )}

          <div>
            <label className="text-sm">Output/Keluaran Kegiatan</label>
            <textarea
              name="outputKegiatan"
              className="mt-1 w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm">Dokumentasi Kegiatan</label>
            <input
              className="mt-1 w-full"
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setDocumentationFiles(Array.from(e.target.files || []))}
            />
            {documentationFiles.length > 0 && (
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                {documentationFiles.map((f) => (
                  <div key={f.name}>
                    {f.name}{" "}
                    <span className="text-gray-500">
                      ({Math.ceil(f.size / 1024)} KB)
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-1 text-xs text-gray-500">
              Bisa unggah lebih dari satu file. Maksimal 2 MB per file. Format: foto, PDF, Word, Excel.
            </div>
          </div>

          <div>
            <label className="text-sm">Kendala</label>
            <textarea
              name="kendala"
              className="mt-1 w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          <button
            className="bg-[#FFA500] text-white rounded px-3 py-1.5 hover:bg-[#e69500]"
            type="submit"
            disabled={saving}
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </form>
      </div>
    </div>
  );
}