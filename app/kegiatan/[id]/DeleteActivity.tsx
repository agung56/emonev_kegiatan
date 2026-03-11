"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConfirm } from "@/app/components/ConfirmContext";
import { useToast } from "@/app/components/ToastContext";

type Props = {
  id: string;
};

export default function DeleteActivityButton({ id }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const ok = await confirm({
      title: "Hapus Kegiatan",
      message: "Yakin ingin menghapus kegiatan ini?",
      confirmText: "Hapus",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!ok) return;

    try {
      setLoading(true);

      const res = await fetch(`/api/activities/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const out = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast(out?.message || out?.error || "Gagal menghapus kegiatan.", "error");
        return;
      }

      toast("Kegiatan berhasil dihapus.", "success");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all disabled:opacity-50"
      title="Hapus kegiatan"
      aria-label="Hapus kegiatan"
    >
      {loading ? (
        "..."
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      )}
    </button>
  );
}
