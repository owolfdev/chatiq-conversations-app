// src/app/dashboard/settings/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import SettingsClient from "./settings-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

interface Profile {
  id: string;
  full_name: string;
  username: string;
  bio: string;
  avatar_url?: string;
  email: string;
  marketing_emails?: boolean;
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?redirect=/dashboard/settings");
  }

  const teamId = await getUserTeamId(user.id);

  // Fetch profile
  const { data: profileData } = await supabase
    .from("bot_user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profile: Profile | null = profileData
    ? { ...profileData, email: user.email || "" }
    : null;

  // Fetch team info and check ownership
  let teamName: string | null = null;
  let isTeamOwner = false;

  if (teamId) {
    const [{ data: team }, { data: membership }] = await Promise.all([
      supabase.from("bot_teams").select("name").eq("id", teamId).maybeSingle(),
      supabase
        .from("bot_team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    teamName = team?.name ?? null;
    isTeamOwner = membership?.role === "owner";
  }

  return (
    <SettingsClient
      initialProfile={profile}
      teamName={teamName}
      isTeamOwner={isTeamOwner}
    />
  );
}
