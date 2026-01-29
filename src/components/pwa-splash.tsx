"use client";

import { useEffect } from "react";

export function PwaSplash() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.appReady = "true";
  }, []);

  return null;
}
