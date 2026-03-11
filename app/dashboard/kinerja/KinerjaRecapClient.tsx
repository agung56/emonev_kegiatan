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

function persenColor(value: number) {
  if (value < 50) return "text-red-600";
  if (value < 80) return "text-yellow-600";
  return "text-green-600";
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
  const [triwulan, setTriwulan] = useState<number>(1);
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

  const daftarTriwulan = [
    { value: 1, label: "Triwulan I (Jan-Mar)" },
    { value: 2, label: "Triwulan II (Apr-Jun)" },
    { value: 3, label: "Triwulan III (Jul-Sep)" },
    { value: 4, label: "Triwulan IV (Okt-Des)" },
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
        ...(mode === "triwulan" ? { triwulan: String(triwulan) } : {}),
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
  }, [tahun, mode, bulan, triwulan]);

  const periods = useMemo(() => (data?.periods || []) as any[], [data]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Rekap Kegiatan</h1>
        </div>

        <div className="ml-auto flex gap-2 items-end">
          <div>
            <label className="text-sm text-muted-foreground font-semibold">Tahun</label>
            <input
              className="block w-28 border border-border bg-card text-foreground rounded px-3 py-1.5 focus:ring-1 focus:ring-primary outline-none transition-all"
              type="number"
              value={tahun}
              onChange={(e) =>
                setTahun(Number(e.target.value || new Date().getFullYear()))
              }
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground font-semibold">Periode</label>
            <select
              className="block w-56 border border-border bg-card text-foreground rounded px-3 py-1.5 focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer"
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as "monthly" | "triwulan" | "year")
              }
            >
              <option value="monthly" className="bg-card text-foreground">Bulan</option>
              <option value="triwulan" className="bg-card text-foreground">Triwulan</option>
              <option value="year" className="bg-card text-foreground">Tahunan</option>
            </select>
          </div>

          {mode === "monthly" && (
            <div>
              <label className="text-sm text-muted-foreground font-semibold">Bulan</label>
              <select
                className="block w-44 border border-border bg-card text-foreground rounded px-3 py-1.5 focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                value={bulan}
                onChange={(e) => setBulan(Number(e.target.value))}
              >
                {daftarBulan.map((b) => (
                  <option key={b.value} value={b.value} className="bg-card text-foreground">
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === "triwulan" && (
            <div>
              <label className="text-sm text-muted-foreground font-semibold">Triwulan</label>
              <select
                className="block w-52 border border-border bg-card text-foreground rounded px-3 py-1.5 focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                value={triwulan}
                onChange={(e) => setTriwulan(Number(e.target.value))}
              >
                {daftarTriwulan.map((t) => (
                  <option key={t.value} value={t.value} className="bg-card text-foreground">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className="h-[34px] px-4 rounded-lg border border-border bg-card text-foreground font-semibold hover:bg-muted/30 transition-all focus:outline-none"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </div>
      </div>

      {err && <div className="mt-4 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl w-full">{err}</div>}

      {!loading && periods.length === 0 && (
        <div className="mt-6 bg-card rounded-xl shadow p-6 border border-border">
          <div className="font-semibold text-foreground">
            Belum ada data kegiatan yang terhubung ke indikator pada tahun {tahun}.
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Pastikan saat input kegiatan Anda memilih indikator kinerja yang didukung.
          </div>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {periods.map((p) => (
          <div key={p.period} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="font-bold text-foreground">{labelPeriod(mode, p.period, tahun)}</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded border border-border">
                {(p.indicators || []).length} indikator
              </div>
            </div>

            {(p.indicators || []).map((ind: any) => {
              const persen =
                Number(ind.totalPagu || 0) > 0
                  ? (
                      (Number(ind.totalRealisasi || 0) /
                        Number(ind.totalPagu || 0)) *
                      100
                    ).toFixed(2)
                  : "0.00";

              return (
                <details key={ind.id} className="border-b border-border last:border-b-0 group">
                  <summary className="cursor-pointer px-4 py-3 hover:bg-muted/30 transition-colors flex flex-wrap items-center gap-3 list-none">
                    <div className="font-medium flex-1 min-w-[280px] text-foreground flex items-center gap-2">
                       <svg className="w-4 h-4 text-primary group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                       </svg>
                       {ind.nama}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Pagu: <b className="text-foreground">{rupiah(ind.totalPagu || 0)}</b>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Realisasi: <b className="text-foreground">{rupiah(ind.totalRealisasi || 0)}</b>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Sisa: <b className="text-foreground">{rupiah(ind.totalSisa || 0)}</b>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Persentase:{" "}
                      <b className={persenColor(Number(persen))}>{persen}%</b>
                    </div>
                  </summary>

                  <div className="px-4 pb-4">
                    <div className="mt-4 overflow-auto border border-border rounded-xl">
                      {(ind.accounts || []).length > 0 && (
                        <table className="min-w-full text-sm border-b border-border">
                          <thead className="bg-muted/50">
                            <tr className="text-muted-foreground uppercase tracking-wider text-[10px] font-bold">
                              <th className="text-left py-3 px-4">
                                Ringkasan Anggaran (Budget Allocation)
                              </th>
                              <th className="text-right py-3 px-4">Pagu</th>
                              <th className="text-right py-3 px-4">Realisasi</th>
                              <th className="text-right py-3 px-4">Sisa</th>
                              <th className="text-right py-3 px-4">%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {(ind.accounts || []).map((a: any) => {
                              const persenAkun =
                                Number(a.pagu || 0) > 0
                                  ? (
                                      (Number(a.realisasi || 0) /
                                        Number(a.pagu || 0)) *
                                      100
                                    ).toFixed(2)
                                  : "0.00";

                              return (
                                <tr key={a.budgetAccountId} className="hover:bg-muted/30 transition-colors">
                                  <td className="py-3 px-4 text-foreground font-medium">{a.namaAkun}</td>
                                  <td className="py-3 px-4 text-right text-muted-foreground">
                                    {rupiah(a.pagu || 0)}
                                  </td>
                                  <td className="py-3 px-4 text-right text-muted-foreground">
                                    {rupiah(a.realisasi || 0)}
                                  </td>
                                  <td className="py-3 px-4 text-right text-muted-foreground">
                                    {rupiah(a.sisa || 0)}
                                  </td>
                                  <td
                                    className={`py-3 px-4 text-right font-bold ${persenColor(
                                      Number(persenAkun)
                                    )}`}
                                  >
                                    {persenAkun}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}

                      <table className="min-w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr className="text-muted-foreground uppercase tracking-wider text-[10px] font-bold">
                            <th className="text-left py-3 px-4">Kegiatan</th>
                            <th className="text-left py-3 px-4">Lokus</th>
                            <th className="text-left py-3 px-4">Akun Anggaran</th>
                            <th className="text-right py-3 px-4">Realisasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {(ind.activities || []).map((a: any) => (
                            <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-3 px-4 text-foreground font-medium">{a.namaKegiatan}</td>
                              <td className="py-3 px-4 text-muted-foreground">{a.lokus}</td>
                              <td className="py-3 px-4 text-muted-foreground">{a.akunAnggaran}</td>
                              <td className="py-3 px-4 text-right font-semibold text-foreground">
                                {rupiah(a.realisasiAnggaran || 0)}
                              </td>
                            </tr>
                          ))}
                          {(ind.activities || []).length === 0 && (
                            <tr>
                              <td className="py-8 px-4 text-center text-muted-foreground italic font-medium" colSpan={4}>
                                Tidak ada kegiatan pada periode ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
