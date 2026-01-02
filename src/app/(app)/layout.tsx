import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { ConversationsTopBar } from "@/components/conversations/top-bar";
import { InstallBanner } from "@/components/pwa/install-banner";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const cookieNames = cookieStore.getAll().map((cookie) => cookie.name);
  const hasSession =
    cookieStore.has("sb-access-token") ||
    cookieStore.has("sb-refresh-token") ||
    cookieNames.some(
      (name) => name.startsWith("sb-") && name.includes("auth-token")
    );
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ConversationsTopBar showUserMenu={hasSession} />
      <InstallBanner />
      <div className="flex-1">{children}</div>
    </div>
  );
}
