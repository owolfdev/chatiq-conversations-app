import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppHeader from "@/components/nav/app-header";
import AppFooter from "@/components/nav/app-footer";
import Footer from "@/components/nav/footer";
import { cookies } from "next/headers";

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
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex-1">{children}</div>
      {hasSession ? <AppFooter /> : <Footer />}
    </div>
  );
}
