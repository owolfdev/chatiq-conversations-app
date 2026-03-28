"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type StowableStatsPanelProps = {
  title: string;
  /** When false, panel starts collapsed (stowed). */
  defaultOpen?: boolean;
  /** Persist expanded state in localStorage (uncontrolled mode only). */
  storageKey?: string;
  /** Hide the default header row; use with controlled `open` + external toggle. */
  hideHeaderTrigger?: boolean;
  /** Controlled expansion (use with `onOpenChange`). Persistence is the parent’s job. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Optional id for `aria-controls` on an external trigger. */
  panelId?: string;
  children: ReactNode;
  className?: string;
};

export function StowableStatsPanel({
  title,
  defaultOpen = false,
  storageKey,
  hideHeaderTrigger = false,
  open: openProp,
  onOpenChange,
  panelId: panelIdProp,
  children,
  className,
}: StowableStatsPanelProps) {
  const autoId = useId();
  const panelId = panelIdProp ?? `stowable-stats-${autoId}`;

  const controlled =
    typeof openProp === "boolean" && typeof onOpenChange === "function";

  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [internalHydrated, setInternalHydrated] = useState(!storageKey);

  useEffect(() => {
    if (controlled) {
      return;
    }
    if (!storageKey || typeof window === "undefined") {
      setInternalHydrated(true);
      return;
    }
    const raw = window.localStorage.getItem(storageKey);
    if (raw === "1") setInternalOpen(true);
    else if (raw === "0") setInternalOpen(false);
    setInternalHydrated(true);
  }, [storageKey, controlled]);

  const open = controlled ? openProp : internalOpen;
  const hydrated = controlled ? true : internalHydrated;

  const handleHeaderClick = useCallback(() => {
    const next = !open;
    if (controlled) {
      onOpenChange(next);
    } else {
      setInternalOpen(next);
      if (storageKey && typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      }
    }
  }, [controlled, open, onOpenChange, storageKey]);

  return (
    <div className={cn("mt-4", className)}>
      {!hideHeaderTrigger ? (
        <button
          type="button"
          onClick={handleHeaderClick}
          aria-expanded={open}
          aria-controls={panelId}
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
      ) : null}
      {hydrated && open ? (
        <div
          id={panelId}
          role="region"
          aria-label={title}
          className={cn(
            "border-t border-transparent",
            hideHeaderTrigger ? "mt-0" : "mt-3"
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
