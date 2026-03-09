"use client";

import { useEffect, useMemo, useState } from "react";

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function labelPeriod(mode: string, p: number, tahun: number) {
  const namaBulan = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  if (mode === "monthly") return `${namaBulan[p - 1]} ${tahun}`;

  if (mode === "triwulan") {
    const triwulan = [
      "Triwulan I (Jan-Mar)",
      "Triwulan II (Apr-Jun)",
      "Triwulan III (Jul-Sep)",
      "Triwulan IV (Okt-Des)",
    ];
    return triwulan[p - 1];
  }

  return `Tahun ${tahun}`;
}

export default function KinerjaRecapClient({
  initialTahun,
  initialSubbagId,
}: {
  initialTahun: number;
  initialSubbagId?: string;
}) {
  const [tahun, setTahun] = useState<number>(initialTahun);
  const [mode, setMode] = useState<"monthly" | "triwulan" | "year">("monthly");
  const [bulan, setBulan] = useState<number>(new Date().getMonth() + 1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const daftarBulan = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" },
  ];

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const qs = new URLSearchParams({
        tahun: String(tahun),
        mode,
        ...(initialSubbagId ? { subbagId: initialSubbagId } : {}),
        ...(mode === "monthly" ? { bulan: String(bulan) } : {}),
      });

      const res = await fetch(`/api/reports/kinerja?${qs.toString()}`, {
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.message || "Gagal memuat rekap kinerja");
      }

      setData(json);
    } catch (e: any) {
      setData(null);
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun, mode, bulan]);

  const periods = useMemo(() => (data?.periods || []) as any[], [data]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-xl font-semibold">Rekap Kegiatan</h1>
        </div>

        <div className="ml-auto flex gap-2 items-end">
          <div>
            <label className="text-sm">Tahun</label>
            <input
              className="block w-28 border rounded px-2 py-1"
              type="number"
              value={tahun}
              onChange={(e) =>
                setTahun(Number(e.target.value || new Date().getFullYear()))
              }
            />
          </div>

          <div>
            <label className="text-sm">Periode</label>
            <select
              className="block w-56 border rounded px-2 py-1"
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as "monthly" | "triwulan" | "year")
              }
            >
              <option value="monthly">Per Bulan</option>
              <option value="triwulan">Per Triwulan</option>
              <option value="year">Tahunan</option>
            </select>
          </div>

          {mode === "monthly" && (
            <div>
              <label className="text-sm">Bulan</label>
              <select
                className="block w-44 border rounded px-2 py-1"
                value={bulan}
                onChange={(e) => setBulan(Number(e.target.value))}
              >
                {daftarBulan.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className="h-9 px-3 rounded border bg-white hover:bg-gray-50"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </div>
      </div>

      {err && <div className="mt-4 text-sm text-red-600">{err}</div>}

      {!loading && periods.length === 0 && (
        <div className="mt-6 bg-white rounded-xl shadow p-6">
          <div className="font-semibold">
            Belum ada data kegiatan yang terhubung ke indikator pada tahun {tahun}.
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Pastikan saat input kegiatan Anda memilih indikator kinerja yang didukung.
          </div>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {periods.map((p) => (
          <div key={p.period} className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-semibold">{labelPeriod(mode, p.period, tahun)}</div>
              <div className="text-xs text-gray-600">
                {(p.indicators || []).length} indikator
              </div>
            </div>

            {(p.indicators || []).map((ind: any) => (
              <details key={ind.id} className="border-b last:border-b-0">
                <summary className="cursor-pointer px-4 py-3 hover:bg-gray-50 flex flex-wrap items-center gap-3">
                  <div className="font-medium flex-1 min-w-[280px]">{ind.nama}</div>
                  <div className="text-sm">
                    Pagu: <b>{rupiah(ind.totalPagu || 0)}</b>
                  </div>
                  <div className="text-sm">
                    Realisasi: <b>{rupiah(ind.totalRealisasi || 0)}</b>
                  </div>
                  <div className="text-sm">
                    Sisa: <b>{rupiah(ind.totalSisa || 0)}</b>
                  </div>
                </summary>

                <div className="px-4 pb-4">
                  {/* <div className="grid md:grid-cols-2 gap-3 mt-2 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">
                        Formula Perhitungan (Master)
                      </div>
                      <div className="whitespace-pre-wrap">
                        {ind.formulaPerhitungan || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Sumber Data (Master)</div>
                      <div className="whitespace-pre-wrap">
                        {ind.sumberData || "-"}
                      </div>
                    </div>
                  </div> */}

                  <div className="mt-4 overflow-auto border rounded">
                    {(ind.accounts || []).length > 0 && (
                      <table className="min-w-full text-sm border-b">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-2">
                              Ringkasan Anggaran (Budget Allocation)
                            </th>
                            <th className="text-right p-2">Pagu</th>
                            <th className="text-right p-2">Realisasi</th>
                            <th className="text-right p-2">Sisa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(ind.accounts || []).map((a: any) => (
                            <tr key={a.budgetAccountId} className="border-t">
                              <td className="p-2">{a.namaAkun}</td>
                              <td className="p-2 text-right">
                                {rupiah(a.pagu || 0)}
                              </td>
                              <td className="p-2 text-right">
                                {rupiah(a.realisasi || 0)}
                              </td>
                              <td className="p-2 text-right">
                                {rupiah(a.sisa || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2">Kegiatan</th>
                          <th className="text-left p-2">Lokus</th>
                          <th className="text-left p-2">Akun Anggaran</th>
                          <th className="text-right p-2">Realisasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(ind.activities || []).map((a: any) => (
                          <tr key={a.id} className="border-t">
                            <td className="p-2">{a.namaKegiatan}</td>
                            <td className="p-2">{a.lokus}</td>
                            <td className="p-2">{a.akunAnggaran}</td>
                            <td className="p-2 text-right">
                              {rupiah(a.realisasiAnggaran || 0)}
                            </td>
                          </tr>
                        ))}
                        {(ind.activities || []).length === 0 && (
                          <tr>
                            <td className="p-3 text-gray-600" colSpan={6}>
                              Tidak ada kegiatan pada periode ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}