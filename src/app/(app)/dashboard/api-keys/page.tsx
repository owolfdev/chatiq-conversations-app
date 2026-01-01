import { getUserApiKeys, getTeamName } from "@/app/actions/api/api-keys";
import { createClient } from "@/utils/supabase/server";
import ApiKeysClient from "./api-keys-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Keys",
};

export default async function ApiKeysPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is admin
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("bot_user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    isAdmin = profile?.role === "admin";
  }

  const [apiKeys, teamName] = await Promise.all([
    getUserApiKeys(),
    getTeamName(),
  ]);

  return (
    <ApiKeysClient
      initialApiKeys={apiKeys}
      teamName={teamName}
      isAdmin={isAdmin}
    />
  );
}
