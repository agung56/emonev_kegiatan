"use client";

import { useEffect, useMemo, useState } from "react";

type Kepemilikan = "LEMBAGA" | "SEKRETARIAT";
type Goal = { id: string; tahun: number; kepemilikan: Kepemilikan; nama: string };
type Indicator = {
  id: string;
  tahun: number;
  kepemilikan: Kepemilikan;
  nama: string;
  strategicGoalId: string;
};

async function fetchJsonSafe(url: string, init?: RequestInit) {
  const res = await fetch(url, { cache: "no-store", credentials: "include", ...init });
  const text = await res.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    return {
      ok: false as const,
      status: res.status,
      message: (data && (data.message || data.error)) || `HTTP ${res.status}. ${text.slice(0, 200)}`,
      data,
    };
  }
  return { ok: true as const, status: res.status, data };
}

export default function SasaranClient(props: {
  initialTahun: number;
  initialKepemilikan: Kepemilikan;
  goals: Goal[];
  indicators: Indicator[];
}) {
  const [newGoalName, setNewGoalName] = useState<string>("");
  const [newIndName, setNewIndName] = useState<string>("");

  const [tahun, setTahun] = useState<number>(props.initialTahun);
  const [kepemilikan, setKepemilikan] = useState<Kepemilikan>(props.initialKepemilikan);

  const [goals, setGoals] = useState<Goal[]>(props.goals);
  const [indicators, setIndicators] = useState<Indicator[]>(props.indicators);

  const [selectedGoalId, setSelectedGoalId] = useState<string>(props.goals[0]?.id || "");
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const selectedIndicators = useMemo(
    () => indicators.filter((i) => i.strategicGoalId === selectedGoalId),
    [indicators, selectedGoalId]
  );

  async function refresh() {
    setErr("");
    const q = new URLSearchParams({ tahun: String(tahun), kepemilikan });

    const r1 = await fetchJsonSafe("/api/strategic-goals?" + q.toString());
    if (!r1.ok) {
      setErr(r1.message);
      setGoals([]);
      setIndicators([]);
      setSelectedGoalId("");
      return;
    }

    const goalsData = r1.data;
    const listGoals: Goal[] = Array.isArray(goalsData) ? goalsData : goalsData?.goals || [];
    setGoals(listGoals);

    // pilih goal pertama jika belum ada
    const nextGoalId = listGoals?.find((g) => g.id === selectedGoalId)?.id || listGoals?.[0]?.id || "";
    setSelectedGoalId(nextGoalId);

    if (nextGoalId) {
      await refreshIndicators(nextGoalId);
    } else {
      setIndicators([]);
    }
  }

  async function refreshIndicators(goalId: string) {
    setErr("");
    const iq = new URLSearchParams({ tahun: String(tahun), kepemilikan, goalId });
    const r2 = await fetchJsonSafe("/api/indicators?" + iq.toString());
    if (!r2.ok) {
      setErr(r2.message);
      setIndicators([]);
      return;
    }
    const indData = r2.data;
    const listInd: Indicator[] = Array.isArray(indData) ? indData : indData?.indicators || [];
    setIndicators(listInd);
  }

  // -------------------------
  // CRUD GOAL
  // -------------------------
  async function createGoal() {
    if (newGoalName.trim().length < 3) return;
    setBusy(true);
    setErr("");

    // ⚠️ Sesuaikan payload kalau API kamu beda:
    const r = await fetchJsonSafe("/api/strategic-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tahun,
        kepemilikan,
        nama: newGoalName.trim(),
      }),
    });

    setBusy(false);

    if (!r.ok) {
      setErr(r.message);
      return;
    }

    setNewGoalName("");
    await refresh();
  }

  async function updateGoal(id: string, nama: string) {
    if (nama.trim().length < 3) return;
    setBusy(true);
    setErr("");

    // ⚠️ Sesuaikan endpoint/body kalau API kamu beda:
    const r = await fetchJsonSafe(`/api/strategic-goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: nama.trim() }),
    });

    setBusy(false);

    if (!r.ok) {
      setErr(r.message);
      return;
    }

    await refresh();
  }

  async function deleteGoal(id: string) {
    if (!confirm("Hapus sasaran ini? Indikator terkait juga akan ikut hilang (jika dihapus cascade).")) return;
    setBusy(true);
    setErr("");

    const r = await fetchJsonSafe(`/api/strategic-goals/${id}`, { method: "DELETE" });

    setBusy(false);

    if (!r.ok) {
      setErr(r.message);
      return;
    }

    // kalau yang dihapus adalah yang sedang dipilih, reset pilihan
    if (selectedGoalId === id) setSelectedGoalId("");
    await refresh();
  }

  // -------------------------
  // CRUD INDICATOR
  // -------------------------
  async function createIndicator() {
    if (!selectedGoalId) return;
    if (newIndName.trim().length < 3) return;

    setBusy(true);
    setErr("");

    // ⚠️ Sesuaikan payload kalau API kamu beda:
    const r = await fetchJsonSafe("/api/indicators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tahun,
        kepemilikan,
        strategicGoalId: selectedGoalId,
        nama: newIndName.trim(),
      }),
    });

    setBusy(false);

    if (!r.ok) {
      setErr(r.message);
      return;
    }

    setNewIndName("");
    await refreshIndicators(selectedGoalId);
  }

  async function updateIndicator(id: string, nama: string) {
    if (!selectedGoalId) return;
    if (nama.trim().length < 3) return;

    setBusy(true);
    setErr("");

    const r = await fetchJsonSafe(`/api/indicators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama: nama.trim() }),
    });

    setBusy(false);

    if (!r.ok) {
      setErr(r.message);
      return;
    }

    await refreshIndicators(selectedGoalId);
  }

  async function deleteIndicator(id: string) {
    if (!selectedGoalId) return;
    if (!confirm("Hapus indikator ini?")) return;

    setBusy(true);
    setErr("");

    const r = await fetchJsonSafe(`/api/indicators/${id}`, { method: "DELETE" });

    setBusy(false);

    if (!r.ok) {
      setErr(r.message);
      return;
    }

    await refreshIndicators(selectedGoalId);
  }

  // when filter changes, auto refresh
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun, kepemilikan]);

  return (
    <div className="mt-4">
      <div className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="text-sm">Tahun</label>
          <input
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="block w-28 border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="text-sm">Kepemilikan</label>
          <select
            value={kepemilikan}
            onChange={(e) => setKepemilikan(e.target.value as Kepemilikan)}
            className="block border rounded px-2 py-1"
          >
            <option value="LEMBAGA">LEMBAGA</option>
            <option value="SEKRETARIAT">SEKRETARIAT</option>
          </select>
        </div>
        {busy && <div className="text-sm text-gray-600">Memproses…</div>}
      </div>

      {err && <div className="mt-3 bg-red-50 text-red-700 border border-red-200 rounded p-3 text-sm">{err}</div>}

      <div className="mt-4 grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold">Sasaran Kegiatan/Program</h2>

          <div className="mt-3 flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-sm">Nama Sasaran</label>
              <input
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                className="block w-full border rounded px-2 py-1"
              />
            </div>
            <button
              className="bg-emerald-600 text-white px-3 py-2 rounded disabled:opacity-50"
              disabled={busy || newGoalName.trim().length < 3}
              onClick={createGoal}
            >
              Tambah
            </button>
          </div>

          <div className="mt-3 border rounded overflow-hidden">
            <div className="max-h-[380px] overflow-auto">
              {goals.map((g) => (
                <GoalRow
                  key={g.id}
                  goal={g}
                  selected={g.id === selectedGoalId}
                  onSelect={async () => {
                    setSelectedGoalId(g.id);
                    await refreshIndicators(g.id);
                  }}
                  onUpdate={updateGoal}
                  onDelete={deleteGoal}
                  busy={busy}
                />
              ))}
              {goals.length === 0 && <div className="p-3 text-gray-600 text-sm">Belum ada sasaran.</div>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold">Indikator Kinerja</h2>
          {!selectedGoalId ? (
            <div className="mt-2 text-sm text-gray-600">Pilih sasaran dulu.</div>
          ) : (
            <>
              <div className="mt-3 flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-sm">Nama Indikator</label>
                  <input
                    value={newIndName}
                    onChange={(e) => setNewIndName(e.target.value)}
                    className="block w-full border rounded px-2 py-1"
                  />
                </div>
                <button
                  className="bg-emerald-600 text-white px-3 py-2 rounded disabled:opacity-50"
                  disabled={busy || newIndName.trim().length < 3}
                  onClick={createIndicator}
                >
                  Tambah
                </button>
              </div>

              <div className="mt-3 border rounded overflow-hidden">
                <div className="max-h-[380px] overflow-auto">
                  {selectedIndicators.map((i) => (
                    <IndicatorRow key={i.id} ind={i} onUpdate={updateIndicator} onDelete={deleteIndicator} busy={busy} />
                  ))}
                  {selectedIndicators.length === 0 && (
                    <div className="p-3 text-gray-600 text-sm">Belum ada indikator untuk sasaran ini.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalRow(props: {
  goal: Goal;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, nama: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  busy: boolean;
}) {
  const [nama, setNama] = useState(props.goal.nama);

  useEffect(() => setNama(props.goal.nama), [props.goal.id, props.goal.nama]);

  return (
    <div className={"p-3 border-b " + (props.selected ? "bg-gray-50" : "")}>
      <div className="flex gap-2 items-start">
        <button className="text-left flex-1" onClick={props.onSelect}>
          <div className="font-medium">{props.goal.nama}</div>
          <div className="text-xs text-gray-600">Klik untuk lihat indikator</div>
        </button>
        <button className="text-red-600 text-sm disabled:opacity-50" disabled={props.busy} onClick={() => props.onDelete(props.goal.id)}>
          Hapus
        </button>
      </div>

      <div className="mt-2 flex gap-2 items-center">
        <input value={nama} onChange={(e) => setNama(e.target.value)} className="border rounded px-2 py-1 w-full" />
        <button
          className="bg-blue-600 text-white px-3 py-1.5 rounded disabled:opacity-50"
          disabled={props.busy || nama.trim().length < 3}
          onClick={() => props.onUpdate(props.goal.id, nama)}
        >
          Update
        </button>
      </div>
    </div>
  );
}

function IndicatorRow(props: {
  ind: Indicator;
  onUpdate: (id: string, nama: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  busy: boolean;
}) {
  const [nama, setNama] = useState(props.ind.nama);
  useEffect(() => setNama(props.ind.nama), [props.ind.id, props.ind.nama]);

  return (
    <div className="p-3 border-b">
      <div className="flex gap-2 items-center">
        <input value={nama} onChange={(e) => setNama(e.target.value)} className="border rounded px-2 py-1 w-full" />
        <button
          className="bg-blue-600 text-white px-3 py-1.5 rounded disabled:opacity-50"
          disabled={props.busy || nama.trim().length < 3}
          onClick={() => props.onUpdate(props.ind.id, nama)}
        >
          Update
        </button>
        <button className="bg-red-600 text-white px-3 py-1.5 rounded disabled:opacity-50" disabled={props.busy} onClick={() => props.onDelete(props.ind.id)}>
          Hapus
        </button>
      </div>
    </div>
  );
}
