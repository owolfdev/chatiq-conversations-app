"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SESSION_KEY = "chatiq.launch_screen_seen";
const FADE_DURATION_MS = 250;
const AUTO_HIDE_MS = 1500;

export function LaunchScreen() {
  const [shouldRender, setShouldRender] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const markHidden = () => {
      setIsVisible(false);
      window.setTimeout(() => setShouldRender(false), FADE_DURATION_MS);
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Ignore storage failures; launch screen is cosmetic.
      }
    };

    let hasSeen = false;
    try {
      hasSeen = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      hasSeen = false;
    }

    if (hasSeen) {
      markHidden();
      return undefined;
    }

    const handleLoad = () => {
      window.setTimeout(markHidden, 100);
    };

    if (document.readyState === "complete") {
      handleLoad();
      return undefined;
    }

    window.addEventListener("load", handleLoad);
    const fallback = window.setTimeout(markHidden, AUTO_HIDE_MS);

    return () => {
      window.removeEventListener("load", handleLoad);
      window.clearTimeout(fallback);
    };
  }, []);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-50 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-emerald-100">
          <Image
            src="/images/avatars/ios-icon.png"
            alt="ChatIQ Inbox"
            width={140}
            height={140}
            priority
          />
        </div>
        <div className="text-sm font-medium text-emerald-700 animate-pulse">
          Launching ChatIQ Inbox...
        </div>
      </div>
    </div>
  );
}
