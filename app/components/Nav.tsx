"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

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
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 17V10" />
        <path d="M12 17V7" />
        <path d="M16 17v-4" />
      </svg>
    );
  if (name === "kegiatan")
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 3v3" />
        <path d="M17 3v3" />
        <path d="M3 8h18" />
        <path d="M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
        <path d="M7 12h4" />
        <path d="M13 12h4" />
        <path d="M7 16h4" />
      </svg>
    );
  if (name === "sasaran")
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 4v2" />
        <path d="M20 12h-2" />
        <path d="M12 20v-2" />
        <path d="M4 12h2" />
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
  if (name === "logs")
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 12h8" />
        <path d="M8 16h8" />
        <path d="M8 20h5" />
      </svg>
    );
  return <span className="w-5 h-5 inline-block" />;
}

export default function Nav({
  session,
  collapsed,
  onCloseMobile,
  className,
}: {
  session: SessionUser;
  collapsed: boolean;
  onCloseMobile: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  const menus = useMemo(() => {
    const base = [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/dashboard/kinerja", label: "Rekap Kegiatan", icon: "kinerja" },
      { href: "/kegiatan", label: "Kegiatan", icon: "kegiatan" },
      { href: "/sasaran", label: "Sasaran", icon: "sasaran" },
      { href: "/budgets", label: "Pagu Global", icon: "budget" },
    ];
    if (session?.role === "SUPER_ADMIN") {
      return [
        ...base,
        { href: "/users", label: "Users", icon: "users" },
        { href: "/logs", label: "Logs", icon: "logs" },
      ];
    }
    return base;
  }, [session?.role]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const sidebar = (
    <aside className={cn(
      "bg-card text-card-foreground border-r border-border h-full shrink-0 transition-all duration-300",
      collapsed ? "w-20" : "w-64",
      "md:h-screen",
      className
    )}>
      <nav className={cn("space-y-1 px-3 pb-3 pt-3", collapsed && "px-2", "md:pt-4")}>
        {menus.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            prefetch={false}
            className={cn(
              "rounded-xl transition-all duration-200",
              collapsed
                ? "flex flex-col items-center justify-center gap-1 px-2 py-3 text-[10px] font-semibold"
                : "flex items-center gap-3 px-3 py-2.5 text-sm font-medium",
              isActive(m.href)
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            title={collapsed ? m.label : undefined}
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth < 768) onCloseMobile();
            }}
          >
            <Icon name={m.icon} />
            <span
              className={cn(
                collapsed
                  ? "max-w-[64px] text-center leading-tight whitespace-normal break-words"
                  : ""
              )}
            >
              {m.label}
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  );

  return sidebar;
}
