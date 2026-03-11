"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import Nav from "./Nav";
import ThemeToggle from "./ThemeToggle";
import LogoutButton from "./LogoutButton";
import { formatSubbagName } from "@/lib/formatSubbag";

const SessionGuard = dynamic(() => import("./SessionGuard"), { ssr: false });

type SessionUser =
  | null
  | {
      id: string;
      name: string;
      email: string;
      role: "SUPER_ADMIN" | "USER";
      subbagId?: string | null;
      subbagName?: string | null;
    };

export default function PageShellClient({
  session,
  children,
  showNav = true,
}: {
  session: SessionUser;
  children: React.ReactNode;
  showNav?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (!showNav) return false;
    try {
      return localStorage.getItem("sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!showNav) return;
    try {
      localStorage.setItem("sidebar_collapsed", collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed, showNav]);

  useEffect(() => {
    if (!showNav) return;
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [showNav]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-all duration-300 antialiased">
      {/* Session guard: auto-logout saat inaktif */}
      {session && <SessionGuard timeoutMinutes={30} warningMinutes={5} />}

      {showNav && (
        <>
          {/* Desktop Sidebar (fixed, di bawah header) */}
          <Nav
            session={session}
            collapsed={collapsed}
            onCloseMobile={() => setOpen(false)}
            className="hidden md:block fixed left-0 top-16 bottom-0 z-[70]"
          />

          {/* Mobile Drawer */}
          <div
            className={`md:hidden fixed left-0 right-0 bottom-0 top-16 z-[75] transition-all duration-300 ${
              open
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0"
            }`}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div
              className={`absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border shadow-2xl transition-transform duration-300 ease-in-out ${
                open ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <Nav
                session={session}
                collapsed={false}
                onCloseMobile={() => setOpen(false)}
                className="w-72"
              />
            </div>
          </div>
        </>
      )}

      <header className="fixed top-0 left-0 right-0 z-[80] bg-background/80 backdrop-blur-xl border-b border-border/50 h-16 flex items-center justify-between px-4 md:px-6 transition-all">
        <div className="flex items-center gap-3">
          {showNav && (
            <button
              className="p-2 hover:bg-muted rounded-xl transition-all shrink-0"
              onClick={() => {
                if (window.innerWidth >= 768) setCollapsed((v) => !v);
                else setOpen((v) => !v);
              }}
              type="button"
              aria-label="Toggle menu"
            >
              <svg
                className="w-5 h-5 text-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}

          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo-kpu.png"
              alt="Logo KPU"
              width={32}
              height={32}
              priority
              className="w-8 h-8 object-contain transition-transform group-hover:scale-110"
            />
            <div className="block leading-tight">
              <span className="font-black text-sm uppercase tracking-tighter text-foreground block">e-Monev Kegiatan</span>
              <span className="hidden sm:block text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none">KPU Kab. Pasuruan</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border">
            <ThemeToggle />
            <div className="w-[1px] h-4 bg-border mx-1" />
            {session ? (
              <div className="flex items-center gap-3 pl-1 pr-1">
                <div className="block text-right max-w-[120px] sm:max-w-[180px]">
                  <div className="text-[9px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-0.5 whitespace-nowrap">
                    {session.role.replace("_", " ")}
                  </div>
                  <div className="text-xs font-bold text-foreground leading-none truncate">
                    {session.role === "USER" && session.subbagName
                      ? formatSubbagName(session.subbagName)
                      : session.name.split(" ")[0]}
                  </div>
                </div>
                <LogoutButton />
              </div>
            ) : (
              <Link href="/login" className="text-xs font-black uppercase tracking-widest px-3 hover:text-primary transition-colors">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area (offset untuk header) */}
      <div
        className={`pt-16 min-h-screen flex flex-col transition-[padding-left] duration-300 ${
          showNav ? (collapsed ? "md:pl-20" : "md:pl-64") : ""
        }`}
      >
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            {children}
          </div>
        </main>

        <footer className="py-8 px-8 border-t border-border/50 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 hover:text-primary transition-colors cursor-default">
            &copy; {new Date().getFullYear()} KPU Kabupaten Pasuruan 
          </p>
        </footer>
      </div>
    </div>
  );
}
