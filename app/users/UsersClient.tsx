"use client";

import { useEffect, useMemo, useState } from "react";
import { formatSubbagName } from "@/lib/formatSubbag";
import { useConfirm } from "@/app/components/ConfirmContext";

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

export default function UsersClient(props: { subbags: Subbag[]; initialUsers: UserRow[]; page: number; take: number; currentUserId: string }) {
  const [users, setUsers] = useState<UserRow[]>(props.initialUsers);
  const [err, setErr] = useState<string>("");
  const [isBusy, setIsBusy] = useState(false);
  const confirm = useConfirm();

  const currentUser = useMemo(() => users.find((u) => u.id === props.currentUserId) || null, [users, props.currentUserId]);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPassword2, setAccountPassword2] = useState("");
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [showAccountPassword2, setShowAccountPassword2] = useState(false);
  const [isAccountBusy, setIsAccountBusy] = useState(false);
  const [accountErr, setAccountErr] = useState<string>("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"SUPER_ADMIN" | "USER">("USER");
  const [subbagId, setSubbagId] = useState<string>("");

  useEffect(() => {
    setUsers(props.initialUsers);
  }, [props.initialUsers]);

  useEffect(() => {
    if (currentUser?.email) setAccountEmail(currentUser.email);
  }, [currentUser?.email]);

  const canCreate = useMemo(() => {
    if (!name.trim() || !email.trim() || password.length < 6) return false;
    if (role === "USER" && !subbagId) return false;
    return true;
  }, [name, email, password, role, subbagId]);

  async function refresh() {
    const res = await fetch(`/api/users?page=${props.page}&take=${props.take}`, { cache: "no-store" });
    const j = await res.json();
    setUsers(j);
  }

  async function saveAccount() {
    setAccountErr("");
    if (!currentUser) return;

    const payload: any = {};

    const emailNorm = accountEmail.trim().toLowerCase();
    const currentEmailNorm = String(currentUser.email || "").trim().toLowerCase();
    if (emailNorm && emailNorm !== currentEmailNorm) payload.email = emailNorm;

    const wantsPassword = accountPassword.length > 0 || accountPassword2.length > 0;
    if (wantsPassword) {
      if (accountPassword.length < 6) {
        setAccountErr("Password minimal 6 karakter.");
        return;
      }
      if (accountPassword !== accountPassword2) {
        setAccountErr("Konfirmasi password tidak sama.");
        return;
      }
      payload.password = accountPassword;
    }

    if (!Object.keys(payload).length) return;

    setIsAccountBusy(true);
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ? JSON.stringify(j.error) : "Gagal menyimpan perubahan akun.");
      }
      setAccountPassword("");
      setAccountPassword2("");
      await refresh();
    } catch (e: any) {
      setAccountErr(e?.message || "Terjadi kesalahan.");
    } finally {
      setIsAccountBusy(false);
    }
  }

  async function createUser() {
    setErr("");
    setIsBusy(true);
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
    } finally {
      setIsBusy(false);
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
    const ok = await confirm({
      title: "Hapus User",
      message: "Yakin ingin menghapus user ini?",
      confirmText: "Hapus",
      cancelText: "Batal",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal hapus user.");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Terjadi kesalahan.");
    }
  }

  return (
    <div className="mt-4 space-y-6">
      {currentUser && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
            Pengaturan Akun
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Email Login</label>
              <input
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
                className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="email@kpu.go.id"
                inputMode="email"
                autoComplete="email"
              />
            </div>

            <div className="md:col-span-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Password Baru</label>
              <div className="relative">
                <input
                  type={showAccountPassword ? "text" : "password"}
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 pr-11 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowAccountPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showAccountPassword ? "Sembunyikan password" : "Tampilkan password"}
                  title={showAccountPassword ? "Sembunyikan" : "Tampilkan"}
                >
                  {showAccountPassword ? (
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

            <div className="md:col-span-1">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Konfirmasi Password</label>
              <div className="relative">
                <input
                  type={showAccountPassword2 ? "text" : "password"}
                  value={accountPassword2}
                  onChange={(e) => setAccountPassword2(e.target.value)}
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 pr-11 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Ulangi password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowAccountPassword2((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showAccountPassword2 ? "Sembunyikan password" : "Tampilkan password"}
                  title={showAccountPassword2 ? "Sembunyikan" : "Tampilkan"}
                >
                  {showAccountPassword2 ? (
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
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
            <button
              className="w-full sm:w-auto bg-primary text-primary-foreground font-bold px-8 py-2.5 rounded-xl text-sm hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
              disabled={isAccountBusy}
              onClick={saveAccount}
              type="button"
            >
              {isAccountBusy ? "Menyimpan..." : "Simpan Perubahan"}
            </button>

            {accountErr && (
              <div className="flex items-center gap-2 text-xs font-medium text-destructive animate-in fade-in slide-in-from-left-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {accountErr}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          Tambah User Baru
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Nama Lengkap</label>
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
              placeholder="Contoh: Ahmad"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Alamat Email</label>
            <input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
              placeholder="email@kpu.go.id"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Kata Sandi</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-muted/30 border border-border rounded-xl px-4 pr-11 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                placeholder="Minimal 6 karakter"
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
          <div>
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Role Akses</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value as any)} 
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer text-foreground"
            >
              <option value="USER" className="bg-card">USER</option>
              <option value="SUPER_ADMIN" className="bg-card">SUPER_ADMIN</option>
            </select>
          </div>
          
          {role === "USER" && (
            <div className="lg:col-span-3">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block">Sub Bagian</label>
              <select 
                value={subbagId} 
                onChange={(e) => setSubbagId(e.target.value)} 
                className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="" className="bg-card text-foreground">-- Pilih Sub Bagian --</option>
                {props.subbags.map((s) => (
                  <option key={s.id} value={s.id} className="bg-card text-foreground">
                    {formatSubbagName(s.nama)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <button 
            className="w-full sm:w-auto bg-primary text-primary-foreground font-bold px-8 py-2.5 rounded-xl text-sm hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50" 
            disabled={!canCreate || isBusy} 
            onClick={createUser}
          >
            {isBusy ? "Menyimpan..." : "Simpan User"}
          </button>
          
          {err && (
            <div className="flex items-center gap-2 text-xs font-medium text-destructive animate-in fade-in slide-in-from-left-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {err}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-muted/50 px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-foreground">Daftar Pengguna</h3>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            {users.length} Total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Nama</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Email</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Role</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Subbag</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Password Baru</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Status</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <UserRowEditor 
                  key={u.id} 
                  u={u} 
                  subbags={props.subbags} 
                  onUpdate={updateUser} 
                  onDelete={deleteUser} 
                />
              ))}
            </tbody>
          </table>
        </div>
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
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function savePassword() {
    if (newPassword.length < 6 || isSavingPassword) return;
    setIsSavingPassword(true);
    try {
      await props.onUpdate(props.u.id, { password: newPassword });
      setNewPassword("");
      setShowNewPassword(false);
    } finally {
      setIsSavingPassword(false);
    }
  }

  useEffect(() => {
    setName(props.u.name);
    setRole(props.u.role);
    setSubbagId(props.u.subbagId || "");
    setIsActive(props.u.isActive);
  }, [props.u.id]);

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-6 py-4">
        <input 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          onBlur={() => name !== props.u.name && props.onUpdate(props.u.id, { name })}
          className="bg-transparent border-none p-0 focus:ring-0 text-foreground font-medium w-full"
        />
      </td>
      <td className="px-6 py-4 text-muted-foreground">{props.u.email}</td>
      <td className="px-6 py-4">
        <select 
          value={role} 
          onChange={(e) => {
            const val = e.target.value as any;
            setRole(val);
            props.onUpdate(props.u.id, { role: val });
          }}
          className="bg-transparent border-none p-0 focus:ring-0 text-xs font-bold text-primary uppercase cursor-pointer"
        >
          <option value="USER" className="bg-card">USER</option>
          <option value="SUPER_ADMIN" className="bg-card">SUPER_ADMIN</option>
        </select>
      </td>
      <td className="px-6 py-4">
        {role === "USER" ? (
          <select 
            value={subbagId} 
            onChange={(e) => {
              const val = e.target.value;
              setSubbagId(val);
              props.onUpdate(props.u.id, { subbagId: val });
            }}
            className="bg-transparent border-none p-0 focus:ring-0 text-xs text-muted-foreground cursor-pointer w-full text-ellipsis"
          >
            <option value="" className="bg-card">-- Pilih Subbag --</option>
            {props.subbags.map((s) => (
              <option key={s.id} value={s.id} className="bg-card">
                {formatSubbagName(s.nama)}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-muted-foreground italic">-</span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 min-w-[220px]">
          <div className="relative flex-1">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") savePassword();
              }}
              className="w-full bg-muted/20 border border-border rounded-xl px-3 pr-10 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="Minimal 6 karakter"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showNewPassword ? "Sembunyikan password" : "Tampilkan password"}
              title={showNewPassword ? "Sembunyikan" : "Tampilkan"}
            >
              {showNewPassword ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 3l18 18" />
                  <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                  <path d="M9.88 5.08A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a18.3 18.3 0 0 1-4.36 5.03" />
                  <path d="M6.61 6.61A18.3 18.3 0 0 0 1 12s4 7 11 7c1.02 0 1.99-.15 2.9-.42" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={savePassword}
            disabled={newPassword.length < 6 || isSavingPassword}
            className="shrink-0 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
            title="Simpan password baru"
          >
            {isSavingPassword ? "..." : "Simpan"}
          </button>
        </div>
      </td>
      <td className="px-6 py-4">
        <button 
          onClick={() => {
            const val = !isActive;
            setIsActive(val);
            props.onUpdate(props.u.id, { isActive: val });
          }}
          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
            isActive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {isActive ? "Aktif" : "Nonaktif"}
        </button>
      </td>
      <td className="px-6 py-4 text-right">
        <button 
          onClick={() => props.onDelete(props.u.id)}
          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
