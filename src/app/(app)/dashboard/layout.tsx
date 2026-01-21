import type React from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/sign-in?redirect=/dashboard");
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background overflow-x-hidden">
      <DashboardHeader />
      <main className="flex-1 min-h-0 p-4 md:p-6 space-y-6 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
