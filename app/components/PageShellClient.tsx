"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "./Nav";
import LogoutButton from "./LogoutButton";

type SessionUser =
  | null
  | { id: string; name: string; email: string; role: "SUPER_ADMIN" | "USER" };

export default function PageShellClient({
  session,
  children,
}: {
  session: SessionUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // close drawer saat resize ke desktop
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="min-h-screen bg-appbg">
      {/* TOPBAR: selalu sejajar dengan konten karena ada di kolom kanan */}
      <div className="h-14 bg-primary text-white flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button className="md:hidden" onClick={() => setOpen(true)} type="button" aria-label="Open menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/" className="font-semibold hover:text-white/90">
            e-Monev Kegiatan
          </Link>
        </div>

        {session ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-sm text-white/90 text-right">
              <div className="font-semibold leading-4">{session.name}</div>
              <div className="text-xs text-white/80">{session.role}</div>
            </div>
            <LogoutButton />
          </div>
        ) : (
          <Link href="/login" className="text-sm underline">
            Login
          </Link>
        )}
      </div>

      {/* LAYOUT 2 KOLOM: sidebar + content */}
      <div className="md:flex">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Nav session={session} onToggleMobile={() => setOpen(false)} />
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 bg-white">
              <Nav session={session} onToggleMobile={() => setOpen(false)} />
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 px-4 md:px-6 py-6">{children}</main>
      </div>
    </div>
  );
}