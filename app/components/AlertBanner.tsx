import React from "react";

type Variant = "warning" | "error" | "info";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Icon({ variant }: { variant: Variant }) {
  if (variant === "error") {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  if (variant === "info") {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="10" x2="12" y2="16" />
        <line x1="12" y1="7.5" x2="12.01" y2="7.5" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default function AlertBanner({
  variant = "warning",
  title = "Peringatan",
  children,
  className,
}: {
  variant?: Variant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const styles =
    variant === "error"
      ? "bg-destructive/10 border-destructive/20 text-destructive"
      : variant === "info"
        ? "bg-primary/10 border-primary/20 text-primary"
        : "bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-200";

  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border p-4 sm:p-5 flex items-start gap-3 shadow-sm",
        styles,
        className
      )}
    >
      <div className="mt-0.5 shrink-0">
        <Icon variant={variant} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80">
          {title}
        </div>
        <div className="mt-1 text-sm font-semibold leading-relaxed break-words">
          {children}
        </div>
      </div>
    </div>
  );
}

