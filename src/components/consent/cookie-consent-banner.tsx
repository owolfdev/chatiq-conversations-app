"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const CONSENT_COOKIE = "cookie_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

type ConsentSettings = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
};

const defaultSettings: ConsentSettings = {
  essential: true,
  analytics: false,
  marketing: false,
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const readCookie = (name: string) => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escapeRegExp(name)}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
};

const writeCookie = (name: string, value: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; path=/; max-age=${CONSENT_MAX_AGE}; samesite=lax`;
};

const persistConsent = (settings: ConsentSettings) => {
  const serialized = JSON.stringify({
    ...settings,
    timestamp: new Date().toISOString(),
  });
  writeCookie(CONSENT_COOKIE, serialized);
  try {
    localStorage.setItem(CONSENT_COOKIE, serialized);
  } catch {
    // Ignore storage failures (private mode, etc.)
  }
};

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const cookieValue = readCookie(CONSENT_COOKIE);
    if (cookieValue) {
      setVisible(false);
      return;
    }

    try {
      const stored = localStorage.getItem(CONSENT_COOKIE);
      if (stored) {
        writeCookie(CONSENT_COOKIE, stored);
        setVisible(false);
        return;
      }
    } catch {
      // Ignore storage failures and show the banner.
    }

    setVisible(true);
  }, []);

  const handleAcceptAll = () => {
    persistConsent({ essential: true, analytics: true, marketing: true });
    setVisible(false);
  };

  const handleRejectOptional = () => {
    persistConsent(defaultSettings);
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="flex w-full flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-emerald-950 shadow-sm ring-1 ring-emerald-100 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
        <p className="text-sm text-emerald-900">
          We use essential cookies to keep ChatIQ secure and working. Optional
          analytics help us improve.{" "}
          <Link
            className="text-emerald-900 underline underline-offset-4"
            href="/legal/privacy"
          >
            Privacy policy
          </Link>
          .
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleAcceptAll}
          >
            Accept all
          </Button>
          <Button
            className="border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100"
            variant="outline"
            onClick={handleRejectOptional}
          >
            Essential only
          </Button>
        </div>
      </div>
    </div>
  );
}
