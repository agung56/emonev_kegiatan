"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm font-bold px-3 py-1 rounded bg-primary text-white hover:bg-primary-dark"
      type="button"
    >
      Logout
    </button>
  );
}
