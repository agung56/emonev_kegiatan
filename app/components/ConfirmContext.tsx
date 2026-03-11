"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ConfirmTone = "danger" | "default";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
};

type ConfirmState = {
  open: boolean;
  options: ConfirmOptions;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const resolverRef = useRef<((v: boolean) => void) | null>(null);
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({
        open: true,
        options: {
          title: options.title || "Konfirmasi",
          message: options.message,
          confirmText: options.confirmText || "OK",
          cancelText: options.cancelText || "Batal",
          tone: options.tone || "default",
        },
      });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setState(null);
    resolve?.(result);
  }, []);

  useEffect(() => {
    if (!state?.open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, state?.open]);

  useEffect(() => {
    if (!state?.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [state?.open]);

  const tone = state?.options.tone || "default";
  const confirmBtnClass = useMemo(() => {
    if (tone === "danger") {
      return "bg-destructive text-destructive-foreground hover:shadow-lg hover:shadow-destructive/20";
    }
    return "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20";
  }, [tone]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {state?.open && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => close(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="p-5 md:p-6">
              <div className="flex items-start gap-3">
                <div
                  className={
                    tone === "danger"
                      ? "mt-0.5 w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20"
                      : "mt-0.5 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20"
                  }
                >
                  {tone === "danger" ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-base font-extrabold text-foreground tracking-tight">
                    {state.options.title}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {state.options.message}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-foreground font-bold text-sm hover:bg-muted/50 transition-all"
                >
                  {state.options.cancelText}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => close(true)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all ${confirmBtnClass}`}
                >
                  {state.options.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
}

