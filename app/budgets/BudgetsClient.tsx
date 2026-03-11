"use client";

import { useEffect, useMemo, useState } from "react";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function parseRupiah(s: string) {
  const x = String(s || "").replace(/[^\d]/g, "");
  return x ? Number(x) : 0;
}

type BudgetDetailRow = {
  id?: string;
  akun: string;
  pagu: number;
  sortOrder?: number;
};

type BudgetPlan = {
  id: string;
  nama: string;
  tahun: number;
  totalPagu: number;
  keterangan?: string | null;
  details: BudgetDetailRow[];
};

export default function BudgetsClient() {
  const nowYear = new Date().getFullYear();
  const [tahun, setTahun] = useState<number>(nowYear);

  const [items, setItems] = useState<BudgetPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetPlan | null>(null);

  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [details, setDetails] = useState<BudgetDetailRow[]>([
    { akun: "", pagu: 0, sortOrder: 0 },
  ]);

  const total = useMemo(
    () => details.reduce((s, d) => s + (Number(d.pagu) || 0), 0),
    [details]
  );

  const API_BASE = "/api/budget-plans";

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const res = await fetch(`${API_BASE}?tahun=${tahun}`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      const ok = data.ok ?? res.ok;

      if (!res.ok || ok === false) {
        throw new Error(data.message || "Gagal memuat anggaran");
      }

      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list);
    } catch (e: any) {
      setErr(e?.message || "Error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun]);

  function openAdd() {
    setEditing(null);
    setNamaKegiatan("");
    setKeterangan("");
    setDetails([{ akun: "", pagu: 0, sortOrder: 0 }]);
    setOpen(true);
  }

  function openEdit(it: BudgetPlan) {
    setEditing(it);
    setNamaKegiatan(it.nama);
    setKeterangan(it.keterangan || "");
    setDetails(
      (it.details?.length ? it.details : [{ akun: "", pagu: 0, sortOrder: 0 }]).map(
        (d, idx) => ({
          id: d.id,
          akun: d.akun,
          pagu: Number(d.pagu || 0),
          sortOrder: d.sortOrder ?? idx,
        })
      )
    );
    setOpen(true);
  }

  function setDetail(idx: number, patch: Partial<BudgetDetailRow>) {
    setDetails((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row))
    );
  }

  function addDetailRow() {
    setDetails((prev) => [
      ...prev,
      {
        akun: "",
        pagu: 0,
        sortOrder: prev.length,
      },
    ]);
  }

  function removeDetailRow(idx: number) {
    setDetails((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== idx);
      return next.map((row, i) => ({
        ...row,
        sortOrder: i,
      }));
    });
  }

  async function save() {
    setErr("");
    setLoading(true);

    try {
      const cleanedDetails = details
        .map((d, idx) => ({
          id: d.id,
          akun: d.akun.trim(),
          pagu: Number(d.pagu || 0),
          sortOrder: d.sortOrder ?? idx,
        }))
        .filter((d) => d.akun.length > 0);

      if (namaKegiatan.trim().length < 3) {
        throw new Error("Nama kegiatan minimal 3 karakter.");
      }

      if (cleanedDetails.length === 0) {
        throw new Error("Minimal 1 detail akun anggaran.");
      }

      const payload = {
        nama: namaKegiatan.trim(),
        tahun,
        keterangan: keterangan.trim() ? keterangan.trim() : null,
        details: cleanedDetails,
      };

      const res = await fetch(editing ? `${API_BASE}/${editing.id}` : API_BASE, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      const ok = data.ok ?? res.ok;

      if (!res.ok || ok === false) {
        const msg =
          data.message ||
          (data.error ? JSON.stringify(data.error) : "Gagal menyimpan");
        throw new Error(msg);
      }

      setOpen(false);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  const empty = !loading && items.length === 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Pagu Anggaran Kegiatan
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Tahun</span>
            <input
              className="w-28 bg-card border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value || nowYear))}
              type="number"
            />
          </div>

          <button
            type="button"
            onClick={openAdd}
            className="bg-primary text-white font-bold rounded-xl px-5 py-2.5 hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Anggaran
          </button>
        </div>
      </div>

      {err && <div className="mt-4 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl">{err}</div>}

      {empty ? (
        <div className="mt-6 border border-border rounded-xl p-6 bg-card shadow-sm">
          <div className="text-lg font-semibold text-foreground">
            Belum ada anggaran untuk tahun {tahun}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Klik tombol <b className="text-foreground">Tambah Anggaran</b> untuk memasukkan <b className="text-foreground">Kegiatan</b> dan{" "}
            <b className="text-foreground">Detail akun</b>.
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="mt-4 px-4 py-2 rounded bg-[#FFA500] text-white hover:bg-[#e69500]"
          >
            Tambah Anggaran
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((it) => (
            <div key={it.id} className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-base text-foreground">{it.nama}</div>
                  <div className="text-sm text-muted-foreground">
                    Tahun: <b>{it.tahun}</b> • Total Pagu:{" "}
                    <b>
                      {rupiah(
                        it.totalPagu ??
                          it.details?.reduce((s, d) => s + Number(d.pagu || 0), 0) ??
                          0
                      )}
                    </b>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Keterangan: {it.keterangan?.trim() ? it.keterangan : "-"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openEdit(it)}
                  className="px-3 py-1.5 rounded border border-border hover:bg-muted/30 text-muted-foreground transition-colors"
                >
                  Edit
                </button>
              </div>

              <div className="p-4 bg-muted/10">
                <div className="text-sm font-medium mb-3 text-foreground">Detail Anggaran</div>

                <div className="grid gap-2">
                  {(it.details || []).map((d, idx) => (
                    <div
                      key={d.id ?? `${it.id}-${idx}`}
                      className="flex items-center justify-between gap-3 text-sm p-2 rounded-lg bg-card border border-border"
                    >
                      <div className="text-foreground">{d.akun}</div>
                      <div className="font-medium text-foreground">{rupiah(Number(d.pagu || 0))}</div>
                    </div>
                  ))}
                  {(it.details || []).length === 0 && (
                    <div className="text-sm text-muted-foreground italic">Belum ada detail akun.</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-foreground">
                {editing ? "Edit Anggaran" : "Tambah Anggaran"}
              </div>
              <button
                type="button"
                className="text-sm font-bold px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted/30 transition-all"
                onClick={() => setOpen(false)}
              >
                Tutup
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5 ml-1">Kegiatan</label>
                <input
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground/50"
                  value={namaKegiatan}
                  onChange={(e) => setNamaKegiatan(e.target.value)}
                  placeholder="contoh: Sosdiklih"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5 ml-1">Tahun Anggaran</label>
                  <input
                    className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                    value={tahun}
                    onChange={(e) => setTahun(Number(e.target.value || nowYear))}
                    type="number"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5 ml-1">Total (auto)</label>
                  <div className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-foreground flex items-center">
                    {rupiah(total)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5 ml-1">Keterangan (opsional)</label>
                <input
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground/50"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="catatan / revisi"
                />
              </div>

              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2 ml-1">Detail Anggaran (per akun)</div>
                <div className="border border-border rounded-xl overflow-hidden bg-muted/10">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr className="text-left">
                        <th className="p-3 font-bold text-muted-foreground">Akun Anggaran</th>
                        <th className="p-3 w-[260px] text-right font-bold text-muted-foreground">Pagu</th>
                        <th className="p-3 w-[90px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.map((d, idx) => (
                        <tr key={d.id ?? `draft-${idx}`} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                          <td className="p-3">
                            <input
                              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50"
                              value={d.akun}
                              onChange={(e) =>
                                setDetail(idx, { akun: e.target.value, sortOrder: idx })
                              }
                              placeholder="misal: Belanja Bahan / Perjalanan Dinas"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <input
                              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-right text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50 font-medium"
                              value={String(d.pagu ?? 0)}
                              onChange={(e) =>
                                setDetail(idx, {
                                  pagu: parseRupiah(e.target.value),
                                  sortOrder: idx,
                                })
                              }
                              placeholder="contoh: 150000000"
                            />
                            <div className="text-[10px] text-muted-foreground mt-1.5 font-bold uppercase tracking-widest text-right mr-1">
                              Tampil: {rupiah(Number(d.pagu || 0))}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              className="text-destructive font-bold text-xs bg-destructive/10 px-3 py-2 rounded-lg hover:bg-destructive hover:text-white transition-all disabled:opacity-50"
                              disabled={details.length <= 1}
                              onClick={() => removeDetailRow(idx)}
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <button
                    type="button"
                    onClick={addDetailRow}
                    className="bg-primary/10 text-primary font-bold rounded-xl px-4 py-2 hover:bg-primary hover:text-white transition-all text-sm"
                  >
                    + Tambah Akun
                  </button>
                  <div className="text-sm text-foreground bg-muted px-4 py-2 rounded-xl font-medium border border-border">
                    Total: <b className="ml-1 text-primary">{rupiah(total)}</b>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-border mt-6">
                <button
                  type="button"
                  disabled={loading}
                  onClick={save}
                  className="bg-primary text-white font-bold rounded-xl px-6 py-2.5 hover:shadow-lg hover:shadow-primary/20 hover:scale-[0.98] transition-all disabled:opacity-50 flex-1"
                >
                  {loading ? "Menyimpan..." : "Simpan Anggaran"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted/30 font-bold transition-all"
                >
                  Batal
                </button>
              </div>

              {err && <div className="text-sm text-red-600">{err}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}