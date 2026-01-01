"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";

interface UpdateTeamNameResult {
  success: boolean;
  error?: string;
}

export async function updateTeamName(
  newName: string
): Promise<UpdateTeamNameResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in?redirect=/dashboard/team");
  }

  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    return { success: false, error: "Team not found." };
  }

  const trimmedName = newName.trim();
  if (trimmedName.length < 2 || trimmedName.length > 60) {
    return {
      success: false,
      error: "Team name must be between 2 and 60 characters.",
    };
  }

  const { data: membership } = await supabase
    .from("bot_team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "owner") {
    return { success: false, error: "Only team owners can rename the team." };
  }

  const { data: existingTeam } = await supabase
    .from("bot_teams")
    .select("name")
    .eq("id", teamId)
    .maybeSingle();

  const { error: updateError } = await supabase
    .from("bot_teams")
    .update({ name: trimmedName })
    .eq("id", teamId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await logAuditEvent({
    teamId,
    userId: user.id,
    action: AUDIT_ACTION.UPDATE,
    resourceType: AUDIT_RESOURCE.TEAM,
    resourceId: teamId,
    metadata: {
      field: "name",
      previous: existingTeam?.name ?? null,
      updated: trimmedName,
    },
  });

  return { success: true };
}

