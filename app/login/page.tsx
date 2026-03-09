"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(params.get("err") ? "Login gagal" : "");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-200">
      <div className="w-full max-w-5xl rounded-xl shadow-lg overflow-hidden bg-white grid grid-cols-1 md:grid-cols-2">
        {/* LEFT */}
        <div className="p-8 md:p-10 flex flex-col items-center justify-center">
          {/* Logo */}
          <img
            src="/logo-kpu.png"
            alt="Logo KPU"
            className="w-20 h-20 mb-4 object-contain animate-float"
          />

          <h1 className="text-2xl font-bold text-[#FFA500] mb-6">Login</h1>

          <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
            <div>
              <label className="text-xs font-semibold text-black">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:[#FFA500]"
                placeholder="Email"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-black">
                Password
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:[#FFA500]"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              className="w-full bg-[#FFA500] text-white rounded px-3 py-2 font-bold transition duration-300 hover:opacity-90 hover:shadow-lg"
              type="submit"
              disabled={loading}
            >
              {loading ? "Memproses..." : "Login"}
            </button>

            {error && <div className="text-sm text-red-600">{error}</div>}
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