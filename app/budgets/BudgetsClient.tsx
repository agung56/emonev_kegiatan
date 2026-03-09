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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            Pagu Anggaran Kegiatan
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">Tahun</span>
            <input
              className="w-28 border rounded px-3 py-2"
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value || nowYear))}
              type="number"
            />
          </div>

          <button
            type="button"
            onClick={openAdd}
            className="bg-[#FFA500] text-white rounded px-3 py-1.5 hover:bg-[#e69500]"
          >
            + Tambah Anggaran
          </button>
        </div>
      </div>

      {err && <div className="mt-4 text-sm text-red-600">{err}</div>}

      {empty ? (
        <div className="mt-6 border rounded-xl p-6 bg-white">
          <div className="text-lg font-semibold">
            Belum ada anggaran untuk tahun {tahun}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Klik tombol <b>Tambah Anggaran</b> untuk memasukkan <b>Kegiatan</b> dan{" "}
            <b>Detail akun</b>.
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
            <div key={it.id} className="border rounded-xl bg-white overflow-hidden">
              <div className="px-4 py-3 border-b flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-base">{it.nama}</div>
                  <div className="text-sm text-gray-600">
                    Tahun: <b>{it.tahun}</b> • Total Pagu:{" "}
                    <b>
                      {rupiah(
                        it.totalPagu ??
                          it.details?.reduce((s, d) => s + Number(d.pagu || 0), 0) ??
                          0
                      )}
                    </b>
                  </div>
                  <div className="text-sm text-gray-600">
                    Keterangan: {it.keterangan?.trim() ? it.keterangan : "-"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openEdit(it)}
                  className="px-3 py-1.5 rounded border hover:bg-gray-50"
                >
                  Edit
                </button>
              </div>

              <div className="p-4">
                <div className="text-sm font-medium mb-2">Detail Anggaran</div>

                <div className="grid gap-2">
                  {(it.details || []).map((d, idx) => (
                    <div
                      key={d.id ?? `${it.id}-${idx}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="text-gray-800">{d.akun}</div>
                      <div className="font-medium">{rupiah(Number(d.pagu || 0))}</div>
                    </div>
                  ))}
                  {(it.details || []).length === 0 && (
                    <div className="text-sm text-gray-600">Belum ada detail akun.</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                {editing ? "Edit Anggaran" : "Tambah Anggaran"}
              </div>
              <button
                type="button"
                className="text-sm px-2 py-1 rounded border"
                onClick={() => setOpen(false)}
              >
                Tutup
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm">Kegiatan</label>
                <input
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={namaKegiatan}
                  onChange={(e) => setNamaKegiatan(e.target.value)}
                  placeholder="contoh: Sosdiklih"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Tahun Anggaran</label>
                  <input
                    className="mt-1 w-full border rounded px-3 py-2"
                    value={tahun}
                    onChange={(e) => setTahun(Number(e.target.value || nowYear))}
                    type="number"
                  />
                </div>
                <div>
                  <label className="text-sm">Total (auto dari per akun)</label>
                  <div className="mt-1 w-full border rounded px-3 py-2 bg-gray-50">
                    {rupiah(total)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm">Keterangan (opsional)</label>
                <input
                  className="mt-1 w-full border rounded px-3 py-2"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="catatan / revisi"
                />
              </div>

              <div>
                <div className="font-medium mb-2">Detail Anggaran (per akun)</div>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left">
                        <th className="p-3">Akun Anggaran</th>
                        <th className="p-3 w-[260px] text-right">Pagu</th>
                        <th className="p-3 w-[90px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.map((d, idx) => (
                        <tr key={d.id ?? `draft-${idx}`} className="border-t">
                          <td className="p-3">
                            <input
                              className="w-full border rounded px-3 py-2"
                              value={d.akun}
                              onChange={(e) =>
                                setDetail(idx, { akun: e.target.value, sortOrder: idx })
                              }
                              placeholder="misal: Belanja Bahan / Perjalanan Dinas"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <input
                              className="w-full border rounded px-3 py-2 text-right"
                              value={String(d.pagu ?? 0)}
                              onChange={(e) =>
                                setDetail(idx, {
                                  pagu: parseRupiah(e.target.value),
                                  sortOrder: idx,
                                })
                              }
                              placeholder="contoh: 150000000"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              Tampil: {rupiah(Number(d.pagu || 0))}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              className="text-red-600 disabled:opacity-50"
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

                <div className="flex items-center justify-between mt-3">
                  <button
                    type="button"
                    onClick={addDetailRow}
                    className="bg-[#FFA500] text-white rounded px-3 py-1.5 hover:bg-[#e69500]"
                  >
                    + Tambah Akun
                  </button>
                  <div className="text-sm text-gray-700">
                    Total: <b>{rupiah(total)}</b>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={save}
                  className="bg-[#FFA500] text-white rounded px-3 py-1.5 hover:bg-[#e69500] disabled:opacity-50"
                >
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded border"
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