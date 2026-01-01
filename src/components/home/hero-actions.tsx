"use client";

import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import { AuthLink } from "@/components/auth/auth-link";

interface HeroActionsProps {
  demoSectionId?: string;
}

export function HeroActions({ demoSectionId = "demo" }: HeroActionsProps) {
  const handleDemoClick = useCallback(() => {
    const demoSection = document.getElementById(demoSectionId);
    demoSection?.scrollIntoView({ behavior: "smooth" });
  }, [demoSectionId]);

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Button
        size="lg"
        className="bg-emerald-500 hover:bg-emerald-600 text-white"
        onClick={handleDemoClick}
      >
        Try the demo
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="border-emerald-500 text-emerald-500 hover:bg-emerald-950"
        asChild
      >
        <AuthLink>Start building</AuthLink>
      </Button>
    </div>
  );
}
