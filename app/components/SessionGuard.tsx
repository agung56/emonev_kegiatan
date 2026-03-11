"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SessionGuardProps {
  /** Durasi timeout inactivity dalam menit (default 30) */
  timeoutMinutes?: number;
  /** Durasi warning sebelum timeout dalam menit (default 5) */
  warningMinutes?: number;
}

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

export default function SessionGuard({
  timeoutMinutes = 30,
  warningMinutes = 5,
}: SessionGuardProps) {
  const router = useRouter();
  const timeoutMs = timeoutMinutes * 60 * 1000;

  // Pastikan warningMs tidak negatif (jika warningMinutes >= timeoutMinutes, skip warning)
  const effectiveWarningMinutes = Math.min(warningMinutes, timeoutMinutes - 1);
  const warningMs =
    effectiveWarningMinutes > 0
      ? (timeoutMinutes - effectiveWarningMinutes) * 60 * 1000
      : timeoutMs; // jika tidak valid, warning = timeout (tidak muncul)

  // Heartbeat interval = setengah dari timeout, minimal 1 menit, maksimal 5 menit
  const heartbeatInterval = Math.max(
    60 * 1000,
    Math.min(5 * 60 * 1000, Math.floor(timeoutMs / 2))
  );

  const lastActivityRef = useRef(Date.now());
  const isActiveRef = useRef(true); // track apakah user aktif sejak heartbeat terakhir
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showWarning, setShowWarning] = useState(false);

  const doLogout = useCallback(
    async (reason: string) => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        router.push(`/login?reason=${reason}`);
        router.refresh();
      }
    },
    [router]
  );

  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    isActiveRef.current = true; // tandai user aktif
    setShowWarning(false);

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

    // Timer untuk tampilkan warning (hanya jika warningMs < timeoutMs)
    if (warningMs < timeoutMs) {
      warningTimerRef.current = setTimeout(() => {
        setShowWarning(true);
      }, warningMs);
    }

    // Timer untuk logout otomatis
    logoutTimerRef.current = setTimeout(() => {
      doLogout("inactive");
    }, timeoutMs);
  }, [warningMs, timeoutMs, doLogout]);

  // Setup activity listeners & timers
  useEffect(() => {
    resetTimers();

    // Throttle agar tidak terlalu sering reset
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const handleActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        resetTimers();
      }, 1000);
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      document.addEventListener(evt, handleActivity, { passive: true })
    );

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        document.removeEventListener(evt, handleActivity)
      );
      if (throttleTimer) clearTimeout(throttleTimer);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [resetTimers]);

  // Heartbeat untuk refresh JWT token — HANYA jika user aktif
  useEffect(() => {
    const sendHeartbeat = async () => {
      // Jangan refresh kalau user tidak aktif
      if (!isActiveRef.current) return;

      // Reset flag, akan di-set true lagi kalau ada aktivitas
      isActiveRef.current = false;

      try {
        const res = await fetch("/api/auth/heartbeat", { method: "POST" });
        if (res.status === 401) {
          doLogout("expired");
        }
      } catch {
        // network error — abaikan
      }
    };

    // Heartbeat pertama setelah interval (bukan langsung)
    heartbeatRef.current = setInterval(sendHeartbeat, heartbeatInterval);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [doLogout, heartbeatInterval]);

  // Cek saat tab kembali visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= timeoutMs) {
          doLogout("inactive");
        } else if (warningMs < timeoutMs && elapsed >= warningMs) {
          setShowWarning(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [timeoutMs, warningMs, doLogout]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-amber-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
          Sesi Akan Berakhir
        </h3>
        <p className="text-sm text-gray-600 text-center mb-6">
          Anda tidak aktif selama beberapa waktu. Sesi Anda akan berakhir dalam{" "}
          <strong>{effectiveWarningMinutes > 0 ? effectiveWarningMinutes : 1} menit</strong>. Klik tombol di bawah untuk
          melanjutkan.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => resetTimers()}
            className="flex-1 bg-[#FFA500] hover:bg-[#e69500] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 shadow-sm"
          >
            Lanjutkan Sesi
          </button>
          <button
            onClick={() => doLogout("manual")}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
