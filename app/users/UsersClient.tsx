"use client";

import { useEffect, useMemo, useState } from "react";

type Subbag = { id: string; nama: string };
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "USER";
  subbagId: string | null;
  isActive: boolean;
  subbag?: { id: string; nama: string } | null;
};

export default function UsersClient(props: { subbags: Subbag[]; initialUsers: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(props.initialUsers);
  const [err, setErr] = useState<string>("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"SUPER_ADMIN" | "USER">("USER");
  const [subbagId, setSubbagId] = useState<string>("");

  const canCreate = useMemo(() => {
    if (!name.trim() || !email.trim() || password.length < 6) return false;
    if (role === "USER" && !subbagId) return false;
    return true;
  }, [name, email, password, role, subbagId]);

  async function refresh() {
    const res = await fetch("/api/users", { cache: "no-store" });
    const j = await res.json();
    setUsers(j);
  }

  async function createUser() {
    setErr("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          subbagId: role === "USER" ? subbagId : null,
          isActive: true,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ? JSON.stringify(j.error) : "Gagal membuat user.");
      }
      setName("");
      setEmail("");
      setPassword("");
      setRole("USER");
      setSubbagId("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Terjadi kesalahan.");
    }
  }

  async function updateUser(id: string, payload: any) {
    setErr("");
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ? JSON.stringify(j.error) : "Gagal update user.");
      }
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Terjadi kesalahan.");
    }
  }

  async function deleteUser(id: string) {
    setErr("");
    if (!confirm("Hapus user ini?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal hapus user.");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Terjadi kesalahan.");
    }
  }

  return (
    <div className="mt-4">
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-semibold">Tambah User</h2>
        <div className="mt-3 grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Nama</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="block w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-sm">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-sm">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full border rounded px-2 py-1" />
            <div className="text-xs text-gray-600 mt-1">Minimal 6 karakter.</div>
          </div>
          <div>
            <label className="text-sm">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as any)} className="block w-full border rounded px-2 py-1">
              <option value="USER">USER</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
          </div>
          {role === "USER" && (
            <div>
              <label className="text-sm">Subbag</label>
              <select value={subbagId} onChange={(e) => setSubbagId(e.target.value)} className="block w-full border rounded px-2 py-1">
                <option value="">(Pilih subbag)</option>
                {props.subbags.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <button className="mt-3 bg-emerald-600 text-white px-3 py-2 rounded disabled:opacity-50" disabled={!canCreate} onClick={createUser}>
          Simpan
        </button>
      </div>

      {err && <div className="mt-3 bg-red-50 text-red-700 border border-red-200 rounded p-3 text-sm">{err}</div>}

      <div className="mt-4 bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Nama</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Subbag</th>
              <th className="text-left p-3">Aktif</th>
              <th className="text-left p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRowEditor key={u.id} u={u} subbags={props.subbags} onUpdate={updateUser} onDelete={deleteUser} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRowEditor(props: {
  u: UserRow;
  subbags: Subbag[];
  onUpdate: (id: string, payload: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState(props.u.name);
  const [role, setRole] = useState<"SUPER_ADMIN" | "USER">(props.u.role);
  const [subbagId, setSubbagId] = useState(props.u.subbagId || "");
  const [isActive, setIsActive] = useState<boolean>(props.u.isActive);
  const [password, setPassword] = useState<string>("");

  useEffect(() => {
    setName(props.u.name);
    setRole(props.u.role);
    setSubbagId(props.u.subbagId || "");
    setIsActive(props.u.isActive);
    setPassword("");
  }, [props.u.id]);

  return (
    <tr className="border-t">
      <td className="p-3">
        <input value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1 w-56" />
      </td>
      <td className="p-3">{props.u.email}</td>
      <td className="p-3">
        <select value={role} onChange={(e) => setRole(e.target.value as any)} className="border rounded px-2 py-1">
          <option value="USER">USER</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
      </td>
      <td className="p-3">
        {role === "USER" ? (
          <select value={subbagId} onChange={(e) => setSubbagId(e.target.value)} className="border rounded px-2 py-1 min-w-[180px]">
            <option value="">(Pilih subbag)</option>
            {props.subbags.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-gray-600">-</span>
        )}
      </td>
      <td className="p-3">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
      </td>
      <td className="p-3">
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="password"
            placeholder="Reset password (opsional)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded px-2 py-1 w-56"
          />
          <button
            className="bg-blue-600 text-white px-3 py-1.5 rounded"
            onClick={() =>
              props.onUpdate(props.u.id, {
                name,
                role,
                subbagId: role === "USER" ? (subbagId || null) : null,
                isActive,
                ...(password ? { password } : {}),
              })
            }
          >
            Update
          </button>
          <button className="bg-red-600 text-white px-3 py-1.5 rounded" onClick={() => props.onDelete(props.u.id)}>
            Hapus
          </button>
        </div>
      </td>
    </tr>
  );
}
