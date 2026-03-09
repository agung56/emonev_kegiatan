"use client";

import React, { useEffect, useState } from "react";

type Detail = {
  id: string;
  kode: string | null;
  uraian: string;
  volume: string; // Decimal -> string
  hargaSatuan: number;
  jumlah: number;
  sortOrder: number;
};

function toNumber(v: string) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID").format(n || 0);
}

export function ActivityBudgetDetailTable({ activityId }: { activityId: string }) {
  const [rows, setRows] = useState<Detail[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/activities/${activityId}/budget-details`, { cache: "no-store" });
    const json = await res.json();
    setRows(json.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  async function addRow() {
    await fetch(`/api/activities/${activityId}/budget-details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kode: null, uraian: "Uraian baru", volume: 1, hargaSatuan: 0, sortOrder: rows.length }),
    });
    await load();
  }

  async function saveRow(
    id: string,
    patch: Partial<{ kode: string | null; uraian: string; volume: number; hargaSatuan: number; sortOrder: number }>
  ) {
    setSavingId(id);
    await fetch(`/api/activities/${activityId}/budget-details/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSavingId(null);
    await load();
  }

  async function removeRow(id: string) {
    await fetch(`/api/activities/${activityId}/budget-details/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) return <div className="text-sm text-gray-600">Memuat rincian…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" className="px-3 py-2 rounded bg-gray-900 text-white" onClick={addRow}>
          + Tambah Rincian
        </button>
        <div className="text-xs text-gray-500">{savingId ? "Menyimpan…" : ""}</div>
      </div>

      <div className="border rounded overflow-auto">
        <table className="min-w-[980px] w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-2 w-[140px] text-left">KODE</th>
              <th className="p-2 text-left">URAIAN</th>
              <th className="p-2 w-[120px] text-right">VOLUME</th>
              <th className="p-2 w-[170px] text-right">HARGA SATUAN</th>
              <th className="p-2 w-[170px] text-right">JUMLAH</th>
              <th className="p-2 w-[80px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2 align-top">
                  <CellText value={r.kode ?? ""} placeholder="—" onCommit={(v) => saveRow(r.id, { kode: v.trim() ? v : null })} />
                </td>
                <td className="p-2 align-top">
                  <CellText value={r.uraian} placeholder="Uraian" onCommit={(v) => saveRow(r.id, { uraian: v })} />
                </td>
                <td className="p-2 align-top text-right">
                  <CellNumber value={String(r.volume)} onCommit={(v) => saveRow(r.id, { volume: v })} />
                </td>
                <td className="p-2 align-top text-right">
                  <CellInt value={String(r.hargaSatuan)} onCommit={(v) => saveRow(r.id, { hargaSatuan: v })} />
                </td>
                <td className="p-2 align-top text-right font-semibold tabular-nums">Rp {rupiah(r.jumlah)}</td>
                <td className="p-2 align-top text-right">
                  <button type="button" className="text-red-600" onClick={() => removeRow(r.id)}>
                    Hapus
                  </button>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-gray-500">
                  Belum ada rincian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-600">
        Catatan: kolom <b>Jumlah</b> otomatis dihitung (<i>volume × harga satuan</i>), dan total akan meng-update kolom
        <b> Realisasi Anggaran</b> kegiatan.
      </div>
    </div>
  );
}

function CellText({ value, placeholder, onCommit }: { value: string; placeholder?: string; onCommit: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);

  if (!editing) {
    return (
      <div className="min-h-[28px] px-2 py-1 rounded hover:bg-gray-50 cursor-text" onClick={() => setEditing(true)} title="Klik untuk edit">
        {value?.trim() ? value : <span className="text-gray-400">{placeholder ?? "—"}</span>}
      </div>
    );
  }

  return (
    <input
      autoFocus
      className="w-full border rounded px-2 py-1"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (val !== value) onCommit(val);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setVal(value);
          setEditing(false);
        }
      }}
    />
  );
}

function CellNumber({ value, onCommit }: { value: string; onCommit: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);

  if (!editing) {
    return (
      <div className="min-h-[28px] px-2 py-1 rounded hover:bg-gray-50 cursor-text text-right tabular-nums" onClick={() => setEditing(true)} title="Klik untuk edit">
        {String(value)}
      </div>
    );
  }

  return (
    <input
      autoFocus
      inputMode="decimal"
      className="w-full border rounded px-2 py-1 text-right tabular-nums"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (val !== value) onCommit(toNumber(val));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setVal(value);
          setEditing(false);
        }
      }}
    />
  );
}

function CellInt({ value, onCommit }: { value: string; onCommit: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);

  if (!editing) {
    return (
      <div className="min-h-[28px] px-2 py-1 rounded hover:bg-gray-50 cursor-text text-right tabular-nums" onClick={() => setEditing(true)} title="Klik untuk edit">
        {rupiah(Number(value) || 0)}
      </div>
    );
  }

  return (
    <input
      autoFocus
      inputMode="numeric"
      className="w-full border rounded px-2 py-1 text-right tabular-nums"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (val !== value) onCommit(Math.max(0, Math.trunc(toNumber(val))));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setVal(value);
          setEditing(false);
        }
      }}
    />
  );
}
