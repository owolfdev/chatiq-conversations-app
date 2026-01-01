// src/components/nav/components/beta-indicator.tsx
// Beta mode indicator badge

"use client";

import { Badge } from "@/components/ui/badge";

export function BetaIndicator() {
  // Check beta mode from client-accessible env var
  // This is safe because it's just a display indicator
  // Next.js replaces process.env.NEXT_PUBLIC_* at build time
  const betaModeValue = process.env.NEXT_PUBLIC_BETA_MODE;
  const isBetaMode = betaModeValue === "true" || betaModeValue === "1";

  // Debug: Remove this after confirming it works
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.log("[BetaIndicator] NEXT_PUBLIC_BETA_MODE:", betaModeValue, "isBetaMode:", isBetaMode);
  }

  // Only show if beta mode is enabled
  if (!isBetaMode) {
    return null;
  }

  return (
    <Badge
      variant="secondary"
      className="text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
    >
      BETA
    </Badge>
  );
}

