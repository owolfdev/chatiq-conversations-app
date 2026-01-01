// src/components/dashboard/trial-header-indicator-client.tsx
"use client";

import { useEffect, useState } from "react";
import { TrialHeaderIndicator } from "./trial-header-indicator";

export function TrialHeaderIndicatorClient() {
  const [trialData, setTrialData] = useState<{
    daysRemaining: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    // Fetch trial data from API
    fetch("/api/dashboard/trial-status")
      .then((res) => res.json())
      .then((data) => {
        // Only set trial data if daysRemaining is a valid number (not null/undefined)
        if (
          typeof data.daysRemaining === "number" &&
          !isNaN(data.daysRemaining)
        ) {
          setTrialData({
            daysRemaining: data.daysRemaining,
            isExpired: data.isExpired === true,
          });
        }
      })
      .catch(() => {
        // Silently fail - don't show indicator if API fails
      });
  }, []);

  if (!trialData) {
    return null;
  }

  return (
    <TrialHeaderIndicator
      daysRemaining={trialData.daysRemaining}
      isExpired={trialData.isExpired}
    />
  );
}

