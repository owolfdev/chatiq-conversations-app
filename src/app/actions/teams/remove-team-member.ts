"use server";

import { createClient } from "@/utils/supabase/server";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";

interface RemoveTeamMemberInput {
  teamId: string;
  memberId: string;
}

interface RemoveTeamMemberResult {
  success: boolean;
  error?: string;
}

export async function removeTeamMember({
  teamId,
  memberId,
}: RemoveTeamMemberInput): Promise<RemoveTeamMemberResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  if (!teamId || !memberId) {
    return { success: false, error: "Missing required parameters." };
  }

  const { data: actorMembership } = await supabase
    .from("bot_team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!actorMembership || actorMembership.role !== "owner") {
    return { success: false, error: "Only owners can remove members." };
  }

  const { data: targetMembership } = await supabase
    .from("bot_team_members")
    .select("id, user_id, role")
    .eq("id", memberId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!targetMembership) {
    return { success: false, error: "Team member not found." };
  }

  if (targetMembership.user_id === user.id) {
    return {
      success: false,
      error: "Use the account settings to leave the team yourself.",
    };
  }

  if (targetMembership.role === "owner") {
    const { count: ownerCount } = await supabase
      .from("bot_team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId)
      .eq("role", "owner");

    if ((ownerCount ?? 0) <= 1) {
      return {
        success: false,
        error: "You must keep at least one owner on the team.",
      };
    }
  }

  const { error: deleteError } = await supabase
    .from("bot_team_members")
    .delete()
    .eq("id", memberId)
    .eq("team_id", teamId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  await logAuditEvent({
    teamId,
    userId: user.id,
    action: AUDIT_ACTION.DELETE,
    resourceType: AUDIT_RESOURCE.TEAM_MEMBER,
    resourceId: memberId,
    metadata: {
      targetUserId: targetMembership.user_id,
      role: targetMembership.role,
    },
  });

  return { success: true };
}

