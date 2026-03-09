"use client";

import React, { useEffect, useMemo, useState } from "react";

type BudgetAccount = { id: string; kodeAkun: string; namaAkun: string };
type BudgetOption = {
  id: string;
  pagu: number;
  used: number;
  usedByThisActivity?: number;
  remaining: number;
  budgetAccount: BudgetAccount;
};

type Usage = {
  id: string;
  budgetAllocationId: string;
  amountUsed: number;
  budgetAllocation: {
    id: string;
    pagu: number;
    budgetAccount: BudgetAccount;
  };
};

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID").format(n || 0);
}

export function ActivityBudgetUsageTable({
  activityId,
  onChanged,
}: {
  activityId: string;
  onChanged?: () => void;
}) {
  const [options, setOptions] = useState<BudgetOption[]>([]);
  const [items, setItems] = useState<Usage[]>([]);
  const [loading, setLoading] = useState(true);

  const [newAllocId, setNewAllocId] = useState<string>("");
  const [newAmount, setNewAmount] = useState<number>(0);

  const [draftAmounts, setDraftAmounts] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);

    const [optRes, useRes] = await Promise.all([
      fetch(`/api/activities/${activityId}/budget-options`, {
        cache: "no-store",
        credentials: "include",
      }),
      fetch(`/api/activities/${activityId}/budget-usages`, {
        cache: "no-store",
        credentials: "include",
      }),
    ]);

    const optJson = await optRes.json().catch(() => ({}));
    const useJson = await useRes.json().catch(() => ({}));

    const nextOptions = optJson.items || [];
    const nextItems = useJson.items || [];

    setOptions(nextOptions);
    setItems(nextItems);

    const nextDrafts: Record<string, number> = {};
    for (const item of nextItems) {
      nextDrafts[item.id] = Number(item.amountUsed || 0);
    }
    setDraftAmounts(nextDrafts);

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  const total = useMemo(
    () => items.reduce((sum, x) => sum + (x.amountUsed || 0), 0),
    [items]
  );

  async function addOrUpdate() {
    if (!newAllocId) {
      alert("Pilih akun anggaran dulu.");
      return;
    }

    if (newAmount < 0) {
      alert("Nilai dipakai tidak boleh negatif.");
      return;
    }

    const res = await fetch(`/api/activities/${activityId}/budget-usages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        budgetAllocationId: newAllocId,
        amountUsed: newAmount,
      }),
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(out?.error || out?.message || "Gagal menyimpan akun anggaran.");
      return;
    }

    setNewAllocId("");
    setNewAmount(0);
    await load();
    onChanged?.();
  }

  async function patch(id: string, amountUsed: number) {
    if (amountUsed < 0) {
      alert("Nilai dipakai tidak boleh negatif.");
      return;
    }

    const res = await fetch(`/api/activities/${activityId}/budget-usages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ amountUsed }),
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(out?.error || out?.message || "Gagal memperbarui nilai dipakai.");
      await load();
      return;
    }

    await load();
    onChanged?.();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/activities/${activityId}/budget-usages/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(out?.error || out?.message || "Gagal menghapus akun anggaran.");
      return;
    }

    await load();
    onChanged?.();
  }

  if (loading) {
    return <div className="text-sm text-gray-600">Memuat akun anggaran…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-700">
        Total Realisasi (dari akun):{" "}
        <span className="font-semibold">Rp {rupiah(total)}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="md:col-span-2">
          <label className="text-xs text-gray-600">
            Pilih Akun Anggaran (berdasarkan alokasi subbag & tahun)
          </label>
          <select
            className="mt-1 w-full border rounded px-3 py-2"
            value={newAllocId}
            onChange={(e) => setNewAllocId(e.target.value)}
          >
            <option value="">(Pilih akun)</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.budgetAccount.kodeAkun} - {o.budgetAccount.namaAkun} | Pagu: Rp{" "}
                {rupiah(o.pagu)} | Sisa: Rp {rupiah(o.remaining)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-600">Nilai dipakai (Rp)</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            type="number"
            min={0}
            value={newAmount}
            onChange={(e) => setNewAmount(Number(e.target.value || 0))}
          />
        </div>
      </div>

      <button
        className="px-3 py-2 rounded bg-gray-900 text-white"
        type="button"
        onClick={addOrUpdate}
      >
        Tambah / Update Akun
      </button>

      <div className="border rounded overflow-auto">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-2 text-left">Akun</th>
              <th className="p-2 text-right">Pagu</th>
              <th className="p-2 text-right">Dipakai (Rp)</th>
              <th className="p-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="p-2">
                  {u.budgetAllocation.budgetAccount.kodeAkun} -{" "}
                  {u.budgetAllocation.budgetAccount.namaAkun}
                </td>

                <td className="p-2 text-right">
                  Rp {rupiah(u.budgetAllocation.pagu)}
                </td>

                <td className="p-2 text-right">
                  <input
                    className="w-40 border rounded px-2 py-1 text-right"
                    type="number"
                    min={0}
                    value={draftAmounts[u.id] ?? 0}
                    onChange={(e) =>
                      setDraftAmounts((prev) => ({
                        ...prev,
                        [u.id]: Number(e.target.value || 0),
                      }))
                    }
                    onBlur={() => {
                      const v = Number(draftAmounts[u.id] ?? 0);
                      if (v !== u.amountUsed) {
                        patch(u.id, v);
                      }
                    }}
                  />
                </td>

                <td className="p-2 text-right">
                  <button
                    className="text-red-600"
                    type="button"
                    onClick={() => remove(u.id)}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td className="p-4 text-gray-600" colSpan={4}>
                  Belum ada akun anggaran untuk kegiatan ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}