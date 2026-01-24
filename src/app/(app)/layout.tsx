import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppHeader from "@/components/nav/app-header";
import { InstallBanner } from "@/components/pwa/install-banner";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <div className="shrink-0">
        <AppHeader />
        <InstallBanner />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
