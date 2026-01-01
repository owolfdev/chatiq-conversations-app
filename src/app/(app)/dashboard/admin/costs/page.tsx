// src/app/dashboard/admin/costs/page.tsx
// Admin Cost Monitoring Dashboard - Platform Admins Only

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CostDashboardClient } from "./cost-dashboard-client";

export default async function AdminCostsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user is platform admin
  const { data: profile } = await supabase
    .from("bot_user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/not-authorized");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Cost Monitoring Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Real-time OpenAI API cost tracking and usage analytics
          </p>
        </div>
        <CostDashboardClient />
      </div>
    </div>
  );
}

