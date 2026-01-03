"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const isStandaloneMode = () => {
  if (typeof window === "undefined") return false;
  const isStandaloneDisplay =
    window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
  const isIosStandalone = "standalone" in navigator && (navigator as any).standalone;
  return Boolean(isStandaloneDisplay || isIosStandalone);
};

export function InstallCta() {
  const [standalone, setStandalone] = useState<boolean | null>(null);

  useEffect(() => {
    setStandalone(isStandaloneMode());
  }, []);

  if (standalone !== false) {
    return null;
  }

  return (
    <Button asChild size="lg" variant="outline">
      <Link href="/install">Install</Link>
    </Button>
  );
}
