"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type StowableStatsPanelProps = {
  title: string;
  /** When false, panel starts collapsed (stowed). */
  defaultOpen?: boolean;
  /** Persist expanded state in localStorage (per browser). */
  storageKey?: string;
  /** Always visible directly under the title row (e.g. quick filters). */
  underTitle?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function StowableStatsPanel({
  title,
  defaultOpen = false,
  storageKey,
  underTitle,
  children,
  className,
}: StowableStatsPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(!storageKey);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      setHydrated(true);
      return;
    }
    const raw = window.localStorage.getItem(storageKey);
    if (raw === "1") setOpen(true);
    else if (raw === "0") setOpen(false);
    setHydrated(true);
  }, [storageKey]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (storageKey && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      }
      return next;
    });
  }, [storageKey]);

  return (
    <div className={cn("mt-4", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card/80 px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-muted/40"
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {underTitle ? (
        <div className="mt-2 border-t border-transparent pt-2">{underTitle}</div>
      ) : null}
      {hydrated && open ? (
        <div className="mt-3 border-t border-transparent">{children}</div>
      ) : null}
    </div>
  );
}
