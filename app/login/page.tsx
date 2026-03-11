"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ThemeToggle from "@/app/components/ThemeToggle";
import Image from "next/image";

function LoginPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pesan berdasarkan alasan redirect
  const reason = params.get("reason");
  const getInitialError = () => {
    if (reason === "inactive") return "Sesi Anda berakhir karena tidak ada aktivitas.";
    if (reason === "expired") return "Sesi Anda telah berakhir. Silakan login kembali.";
    if (params.get("err")) return "Login gagal";
    return "";
  };
  const [error, setError] = useState(getInitialError());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {}

      if (!res.ok || !data.ok) {
        setError(data.message || `Login gagal. Response: ${text.slice(0, 200)}`);
        setLoading(false);
        return;
      }

      setLoading(false);
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Terjadi kesalahan");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background relative">
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border">
          <ThemeToggle />
        </div>
      </div>
      <div className="w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden bg-card grid grid-cols-1 md:grid-cols-2 border border-border">
        {/* LEFT */}
        <div className="p-8 md:p-12 flex flex-col items-center justify-center">
          {/* Logo */}
          <div className="bg-primary/10 p-5 md:p-6 rounded-full mb-6">
            <Image
              src="/app_logo.png"
              alt="Logo KPU"
              width={112}
              height={112}
              priority
              className="w-20 h-20 md:w-24 md:h-24 object-contain animate-float"
            />
          </div>

          <h1 className="text-3xl font-extrabold text-foreground mb-2">Selamat Datang</h1>
          <p className="text-muted-foreground mb-8 text-center text-sm">Silakan login untuk mengakses e-Monev Kegiatan</p>

          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="nama@email.com"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 pr-11 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  title={showPassword ? "Sembunyikan" : "Tampilkan"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 3l18 18" />
                      <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                      <path d="M9.88 5.08A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a18.3 18.3 0 0 1-4.36 5.03" />
                      <path d="M6.61 6.61A18.3 18.3 0 0 0 1 12s4 7 11 7c1.02 0 1.99-.15 2.9-.42" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              className="w-full bg-primary text-primary-foreground rounded-xl px-4 py-3 font-bold transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Memproses...
                </span>
              ) : "Log In"}
            </button>

            {error && (
              <div className={`text-xs font-medium rounded-xl px-4 py-3 flex items-center gap-3 border transition-all ${
                reason === "inactive" || reason === "expired"
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`}>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}
          </form>
        </div>

        {/* RIGHT */}
        <div className="p-8 md:p-10 text-white bg-[#FFA500]">
          <h2 className="text-3xl font-extrabold leading-tight text-center mb-10">
            e-Monev Kegiatan
            <br />
            Komisi Pemilihan Umum
            <br />
            Kabupaten Pasuruan
          </h2>

          <div className="space-y-8 text-sm leading-relaxed">
            <div>
              <h3 className="text-lg font-bold mb-2">Visi</h3>
              <p>
                Terwujudnya Penyelenggaraan Pemilu dan Pemilihan yang Berkualitas dan Berintegritas sebagai Pilar Demokrasi Substansial dalam rangka Mewujudkan Indonesia Emas 2045.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-2">Misi</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Menyelenggarakan Pemilu dan Pemilihan yang Memenuhi Asas LUBER dan JURDIL pada Periode 2025-2029.
                </li>
                <li>
                  Menguatkan Kapasitas Kelembagaan KPU yang Efektif, Efisien, dan Akuntabel pada Periode 2025-2029.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 text-primary">
          <svg viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
