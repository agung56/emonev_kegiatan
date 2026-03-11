"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/app/components/ConfirmContext";
import { useToast } from "@/app/components/ToastContext";
import { formatApiError } from "@/lib/formatApiError";

function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function LogsCleanupClient() {
  const router = useRouter();
  const confirm = useConfirm();
  const { toast } = useToast();

  const [day, setDay] = useState(todayLocalISO());
  const [month, setMonth] = useState(monthLocalISO());
  const [busy, setBusy] = useState<"day" | "month" | null>(null);

  const canDay = useMemo(() => /^\d{4}-\d{2}-\d{2}$/.test(day), [day]);
  const canMonth = useMemo(() => /^\d{4}-\d{2}$/.test(month), [month]);

  async function cleanupDay() {
    if (!canDay || busy) return;
    const ok = await confirm({
      title: "Hapus Log Harian",
      message: `Yakin ingin menghapus semua log pada tanggal ${day}?`,
      confirmText: "Hapus",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!ok) return;

    setBusy("day");
    try {
      const res = await fetch("/api/logs/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode: "day", day }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error ? formatApiError(j.error) : "Gagal menghapus log.");
      toast(`Berhasil menghapus ${Number(j.deleted || 0)} log.`, "success");
      router.refresh();
    } catch (e: any) {
      toast(e?.message || "Terjadi kesalahan.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function cleanupMonth() {
    if (!canMonth || busy) return;
    const ok = await confirm({
      title: "Hapus Log Bulanan",
      message: `Yakin ingin menghapus semua log pada bulan ${month}?`,
      confirmText: "Hapus",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!ok) return;

    setBusy("month");
    try {
      const res = await fetch("/api/logs/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode: "month", month }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) throw new Error(j?.error ? formatApiError(j.error) : "Gagal menghapus log.");
      toast(`Berhasil menghapus ${Number(j.deleted || 0)} log.`, "success");
      router.refresh();
    } catch (e: any) {
      toast(e?.message || "Terjadi kesalahan.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-4 md:p-5">
      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
        Pengelolaan Log
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-muted/10 p-4">
          <div className="font-bold text-foreground mb-3">Hapus per Hari</div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="flex-1 bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
            <button
              type="button"
              onClick={cleanupDay}
              disabled={!canDay || busy !== null}
              className="px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm hover:shadow-lg hover:shadow-destructive/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {busy === "day" ? "Menghapus..." : "Hapus"}
            </button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Menghapus semua log pada tanggal yang dipilih.
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/10 p-4">
          <div className="font-bold text-foreground mb-3">Hapus per Bulan</div>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="flex-1 bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
            <button
              type="button"
              onClick={cleanupMonth}
              disabled={!canMonth || busy !== null}
              className="px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm hover:shadow-lg hover:shadow-destructive/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {busy === "month" ? "Menghapus..." : "Hapus"}
            </button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Menghapus semua log pada bulan yang dipilih.
          </div>
        </div>
      </div>
    </div>
  );
}

