"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type SessionUser =
  | null
  | { id: string; name: string; email: string; role: "SUPER_ADMIN" | "USER" };

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Icon({ name }: { name: string }) {
  if (name === "dashboard")
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-12h8V3h-8v6Z" />
      </svg>
    );
  if (name === "kinerja")
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <path d="M7 14l3-3 3 3 5-7" />
      </svg>
    );
  if (name === "kegiatan")
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    );
  if (name === "sasaran")
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    );
  if (name === "budget")
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1v22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    );
  if (name === "users")
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  return <span className="w-5 h-5 inline-block" />;
}

export default function Nav({
  session,
  onToggleMobile,
}: {
  session: SessionUser;
  onToggleMobile: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem("sidebar_collapsed");
    if (v === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const menus = useMemo(() => {
    const base = [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/dashboard/kinerja", label: "Rekap Kegiatan", icon: "kinerja" },
      { href: "/kegiatan", label: "Kegiatan", icon: "kegiatan" },
      { href: "/sasaran", label: "Sasaran", icon: "sasaran" },
      { href: "/budgets", label: "Pagu Global", icon: "budget" },
    ];
    return session?.role === "SUPER_ADMIN" ? [...base, { href: "/users", label: "Users", icon: "users" }] : base;
  }, [session?.role]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const sidebar = (
    <aside className={cn("bg-white border-r h-screen shrink-0", collapsed ? "w-16" : "w-64")}>
      <div className="flex items-center justify-between px-2 py-2">
        {/* /*<div className={cn("font-semibold text-sm px-2", collapsed && "hidden")}>Menu</div> */}

        <button
          className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded hover:bg-gray-100"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Perbesar sidebar" : "Minimize sidebar"}
          type="button"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
          </svg>
        </button>

        <button className="md:hidden w-9 h-9 rounded hover:bg-gray-100" onClick={onToggleMobile} type="button">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="space-y-1 px-2 pb-3">
        {menus.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded text-sm",
              isActive(m.href) ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
            )}
            title={collapsed ? m.label : undefined}
          >
            <Icon name={m.icon} />
            <span className={cn(collapsed && "hidden")}>{m.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );

  return sidebar;
}