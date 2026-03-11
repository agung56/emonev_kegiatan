"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/app/components/ConfirmContext";

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
  const res = await fetch(url, { cache: "no-store", ...init });
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
      message: (data && (data.message || data.error)) || `HTTP ${res.status}`,
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
  const confirm = useConfirm();
  const [tahun, setTahun] = useState<number>(props.initialTahun);
  const [kepemilikan, setKepemilikan] = useState<Kepemilikan>(props.initialKepemilikan);
  const [goals, setGoals] = useState<Goal[]>(props.goals);
  const [indicators, setIndicators] = useState<Indicator[]>(props.indicators);
  const [selectedGoalId, setSelectedGoalId] = useState<string>(props.goals[0]?.id || "");
  const [newGoalName, setNewGoalName] = useState("");
  const [newIndName, setNewIndName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedIndicators = useMemo(
    () => indicators.filter((i) => i.strategicGoalId === selectedGoalId),
    [indicators, selectedGoalId]
  );

  const selectedGoal = useMemo(
    () => goals.find(g => g.id === selectedGoalId),
    [goals, selectedGoalId]
  );

  async function refresh() {
    setErr("");
    const q = new URLSearchParams({ tahun: String(tahun), kepemilikan });
    const r = await fetchJsonSafe("/api/strategic-goals?" + q.toString());
    if (r.ok) {
      const list: Goal[] = Array.isArray(r.data) ? r.data : (r.data?.goals || []);
      setGoals(list);
      if (!list.find(g => g.id === selectedGoalId)) {
        setSelectedGoalId(list[0]?.id || "");
      }
    }
  }

  async function refreshIndicators(goalId: string) {
    if (!goalId) return;
    const q = new URLSearchParams({ tahun: String(tahun), kepemilikan, goalId });
    const r = await fetchJsonSafe("/api/indicators?" + q.toString());
    if (r.ok) {
      const list: Indicator[] = Array.isArray(r.data) ? r.data : (r.data?.indicators || []);
      setIndicators(prev => {
        const other = prev.filter(i => i.strategicGoalId !== goalId);
        return [...other, ...list];
      });
    }
  }

  useEffect(() => {
    refresh();
  }, [tahun, kepemilikan]);

  useEffect(() => {
    if (selectedGoalId) refreshIndicators(selectedGoalId);
  }, [selectedGoalId]);

  async function createGoal() {
    if (newGoalName.trim().length < 3) return;
    setBusy(true);
    const r = await fetchJsonSafe("/api/strategic-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tahun, kepemilikan, nama: newGoalName.trim() }),
    });
    setBusy(false);
    if (r.ok) {
      setNewGoalName("");
      refresh();
    } else setErr(r.message);
  }

  async function createIndicator() {
    if (!selectedGoalId || newIndName.trim().length < 3) return;
    setBusy(true);
    const r = await fetchJsonSafe("/api/indicators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tahun, kepemilikan, strategicGoalId: selectedGoalId, nama: newIndName.trim() }),
    });
    setBusy(false);
    if (r.ok) {
      setNewIndName("");
      refreshIndicators(selectedGoalId);
    } else setErr(r.message);
  }

  async function deleteGoal(id: string) {
    const ok = await confirm({
      title: "Hapus Sasaran",
      message: "Yakin ingin menghapus sasaran ini?",
      confirmText: "Hapus",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    const r = await fetchJsonSafe(`/api/strategic-goals/${id}`, { method: "DELETE" });
    setBusy(false);
    if (r.ok) refresh();
    else setErr(r.message);
  }

  async function deleteIndicator(id: string) {
    const ok = await confirm({
      title: "Hapus Indikator",
      message: "Yakin ingin menghapus indikator ini?",
      confirmText: "Hapus",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    const r = await fetchJsonSafe(`/api/indicators/${id}`, { method: "DELETE" });
    setBusy(false);
    if (r.ok) refreshIndicators(selectedGoalId);
    else setErr(r.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Tahun Anggaran</label>
            <input
              type="number"
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="block w-32 bg-muted/50 border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Kepemilikan</label>
            <select
              value={kepemilikan}
              onChange={(e) => setKepemilikan(e.target.value as Kepemilikan)}
              className="block bg-muted/50 border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold cursor-pointer"
            >
              <option value="LEMBAGA" className="bg-card text-foreground">Lembaga</option>
              <option value="SEKRETARIAT" className="bg-card text-foreground">Sekretariat</option>
            </select>
          </div>
        </div>
        {busy && (
          <div className="flex items-center gap-2 text-primary animate-pulse">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-widest">Processing</span>
          </div>
        )}
      </div>

      {err && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-4 text-xs font-bold flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {err}
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-muted/50 px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Daftar Sasaran</h3>
              <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">{goals.length}</span>
            </div>
            
            <div className="p-4 border-b border-border bg-muted/20">
              <div className="flex gap-2">
                <input
                  placeholder="Tambah sasaran baru..."
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
                <button
                  disabled={busy || newGoalName.trim().length < 3}
                  onClick={createGoal}
                  className="bg-primary text-white p-2 rounded-xl hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto divide-y divide-border scrollbar-hide">
              {goals.map((g) => (
                <div 
                  key={g.id}
                  className={`group relative flex items-center justify-between p-4 transition-all cursor-pointer ${
                    selectedGoalId === g.id ? "bg-primary/5 border-l-4 border-primary" : "hover:bg-muted/30 border-l-4 border-transparent"
                  }`}
                  onClick={() => setSelectedGoalId(g.id)}
                >
                  <div className="flex-1 min-w-0 pr-8">
                    <div className={`text-sm font-bold truncate transition-colors ${selectedGoalId === g.id ? "text-primary" : "text-foreground"}`}>
                      {g.nama}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteGoal(g.id); }}
                    className="absolute right-4 opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
              {goals.length === 0 && (
                <div className="p-12 text-center">
                  <p className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">Kosong</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detail Content */}
        <div className="lg:col-span-8">
          {selectedGoal ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                <div className="mb-8">
                  <div className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">Sasaran Terpilih</div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight leading-tight">{selectedGoal.nama}</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Indikator Kinerja</h3>
                    <span className="text-[10px] font-black bg-muted px-2 py-0.5 rounded-full">{selectedIndicators.length} Total</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      placeholder="Input indikator kinerja baru..."
                      value={newIndName}
                      onChange={(e) => setNewIndName(e.target.value)}
                      className="flex-1 bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                    <button
                      disabled={busy || newIndName.trim().length < 3}
                      onClick={createIndicator}
                      className="bg-primary text-white font-bold px-6 rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50"
                    >
                      Tambah
                    </button>
                  </div>

                  <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border">
                    {selectedIndicators.map((i) => (
                      <div key={i.id} className="group flex items-center justify-between p-4 bg-muted/5 hover:bg-muted/10 transition-all">
                        <div className="text-sm font-medium text-foreground">{i.nama}</div>
                        <button
                          onClick={() => deleteIndicator(i.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {selectedIndicators.length === 0 && (
                      <div className="p-12 text-center text-muted-foreground/30 italic text-sm">
                        Belum ada indikator untuk sasaran ini.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border border-dashed rounded-3xl p-24 flex flex-col items-center justify-center text-center opacity-50">
              <div className="w-16 h-16 bg-muted rounded-2xl mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Pilih Sasaran</h3>
              <p className="text-xs font-bold text-muted-foreground mt-2 max-w-xs leading-relaxed uppercase tracking-widest">Silakan pilih sasaran dari daftar untuk mengelola indikator kinerja.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
