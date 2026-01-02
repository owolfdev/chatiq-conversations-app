"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { usePathname } from "next/navigation";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const isStandaloneMode = () => {
  if (typeof window === "undefined") return false;
  const isStandaloneDisplay =
    window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
  const isIosStandalone = "standalone" in navigator && (navigator as any).standalone;
  return Boolean(isStandaloneDisplay || isIosStandalone);
};

const getPlatform = () => {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
};

export function InstallBanner() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setStandalone(isStandaloneMode());

    const stored = window.localStorage.getItem("pwa-install-dismissed");
    if (stored === "true") {
      setDismissed(true);
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (standalone || dismissed || pathname === "/install") {
    return null;
  }

  const platform = getPlatform();
  const canPrompt = platform === "android" && deferredPrompt;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="border-b bg-muted/40">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3 text-sm">
        <div className="flex-1 text-muted-foreground">
          Install the app for the best experience.
        </div>
        {canPrompt ? (
          <Button size="sm" onClick={handleInstall} className="gap-2">
            <Download className="h-4 w-4" />
            Install
          </Button>
        ) : (
          <Button size="sm" variant="outline" asChild>
            <Link href="/install">How to install</Link>
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setDismissed(true);
            window.localStorage.setItem("pwa-install-dismissed", "true");
          }}
          aria-label="Dismiss install banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
