// src/app/dashboard/admin/users/page.tsx

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AdminUsersTable } from "./users-table";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

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
          <h1 className="text-3xl font-bold">User Directory</h1>
          <p className="text-muted-foreground mt-2">
            Search users, filter by plan, and drill into analytics
          </p>
        </div>
        <AdminUsersTable />
      </div>
    </div>
  );
}
