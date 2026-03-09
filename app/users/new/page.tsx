"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Subbag = { id: string; nama: string };

export default function NewUserPage() {
  const router = useRouter();
  const [subbags, setSubbags] = useState<Subbag[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [role, setRole] = useState<"USER" | "SUPER_ADMIN">("USER");
  const [subbagId, setSubbagId] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    (async () => {
      setErr("");
      const res = await fetch("/api/subbags", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErr(data.message || "Gagal memuat subbag");
        return;
      }
      setSubbags(data.subbags || []);
      if ((data.subbags || []).length > 0) setSubbagId(data.subbags[0].id);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, pass, role, subbagId, isActive }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.error ? JSON.stringify(data.error) : data?.message;
        setErr(msg || "Gagal menambahkan user");
        setLoading(false);
        return;
      }

      router.push("/users");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Terjadi kesalahan");
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-semibold">Tambah User</h1>
      <p className="text-sm text-gray-600 mt-1">Khusus Super Admin.</p>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="text-sm">Nama</label>
          <input className="mt-1 w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label className="text-sm">Email</label>
          <input className="mt-1 w-full border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div>
          <label className="text-sm">Password</label>
          <input type="password" className="mt-1 w-full border rounded px-3 py-2" value={pass} onChange={(e) => setPass(e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Role</label>
            <select className="mt-1 w-full border rounded px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="USER">USER</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
          </div>

          <div>
            <label className="text-sm">Subbag</label>
            <select className="mt-1 w-full border rounded px-3 py-2" value={subbagId} onChange={(e) => setSubbagId(e.target.value)}>
              {subbags.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Aktif
        </label>

        {err && <div className="text-sm text-red-600">{err}</div>}

        <div className="flex gap-2 pt-2">
          <button disabled={loading} className="px-4 py-2 rounded bg-gray-900 text-white disabled:opacity-50" type="submit">
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
          <button type="button" className="px-4 py-2 rounded border" onClick={() => router.push("/users")}>
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
