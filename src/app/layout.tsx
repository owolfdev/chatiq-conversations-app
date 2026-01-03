// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google"; // ✅ Use IBM Plex fonts
import "./globals.css";
import { AppThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { SentryInit } from "@/components/sentry-init";
import { env } from "@/lib/env";
import { getAppUrl } from "@/lib/email/get-app-url";

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Choose what weights you use
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const appUrl = getAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "ChatIQ Inbox",
    template: "%s | ChatIQ Inbox",
  },
  description: "ChatIQ Inbox - a focused conversations inbox for ChatIQ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ChatIQ Inbox",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "ChatIQ Inbox",
    description: "ChatIQ Inbox - a focused conversations inbox for ChatIQ",
    type: "website",
    siteName: "ChatIQ Inbox",
    url: appUrl,
    images: [
      {
        url: `${appUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "ChatIQ Inbox - Conversations inbox for ChatIQ.",
      },
      {
        url: `${appUrl}/api/og-image`,
        width: 1200,
        height: 630,
        alt: "ChatIQ Inbox - Conversations inbox for ChatIQ.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatIQ Inbox",
    description: "ChatIQ Inbox - a focused conversations inbox for ChatIQ",
    images: [
      `${appUrl}/og-image.png`,
      `${appUrl}/api/og-image`,
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10b981",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enableAnalytics = env.ENABLE_VERCEL_ANALYTICS;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plexSans.variable} ${plexMono.variable} antialiased flex flex-col min-h-screen font-main`}
      >
        <AppThemeProvider>
          <SentryInit />
          {children}
          <Toaster />
          {enableAnalytics ? <Analytics /> : null}
        </AppThemeProvider>
      </body>
    </html>
  );
}
