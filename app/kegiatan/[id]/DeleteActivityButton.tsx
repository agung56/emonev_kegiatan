"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  activityId: string;
  docId: string;
  fileName: string;
};

export default function DeleteDocumentationButton({
  activityId,
  docId,
  fileName,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const ok = confirm(`Yakin ingin menghapus file "${fileName}"?`);
    if (!ok) return;

    try {
      setLoading(true);

      const res = await fetch(
        `/api/activities/${activityId}/documentation/${docId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const out = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(out?.message || "Gagal menghapus file");
        return;
      }

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
      className="text-red-600 hover:underline disabled:opacity-50"
      title="Hapus file"
    >
      {loading ? (
    "..."
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )}
    </button>
  );
}