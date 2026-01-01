// src/components/dashboard/trial-header-indicator.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Clock, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface TrialHeaderIndicatorProps {
  daysRemaining: number;
  isExpired: boolean;
}

export function TrialHeaderIndicator({
  daysRemaining,
  isExpired,
}: TrialHeaderIndicatorProps) {
  const [dismissed, setDismissed] = useState(false);

  // Don't show if daysRemaining is invalid
  if (
    typeof daysRemaining !== "number" ||
    isNaN(daysRemaining) ||
    daysRemaining < 0
  ) {
    return null;
  }

  // Only show in warning phase (≤7 days) or expired, and not dismissed
  if (dismissed || (!isExpired && daysRemaining > 7)) {
    return null;
  }

  const isLastDay = daysRemaining === 1 && !isExpired;
  const isExpiredState = isExpired;

  return (
    <Link
      href="/pricing"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900/70 border border-amber-300 dark:border-amber-700 transition-colors group"
      onClick={(e) => {
        // Allow navigation to pricing page
      }}
    >
      <Clock className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
      <span className="text-xs font-medium text-amber-900 dark:text-amber-100 whitespace-nowrap">
        {isExpiredState
          ? "Evaluation expired"
          : isLastDay
          ? "Last day!"
          : `${daysRemaining} days left`}
      </span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDismissed(true);
        }}
        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3 text-amber-700 dark:text-amber-400" />
      </button>
    </Link>
  );
}
