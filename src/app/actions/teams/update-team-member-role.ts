"use server";

import { createClient } from "@/utils/supabase/server";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";
import type { TeamRole } from "@/types/teams";

interface UpdateTeamMemberRoleInput {
  teamId: string;
  memberId: string;
  newRole: TeamRole;
}

interface UpdateTeamMemberRoleResult {
  success: boolean;
  error?: string;
  updatedRole?: TeamRole;
}

async function countOwners(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string
): Promise<number> {
  const { count } = await supabase
    .from("bot_team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("role", "owner");

  return count ?? 0;
}

export async function updateTeamMemberRole({
  teamId,
  memberId,
  newRole,
}: UpdateTeamMemberRoleInput): Promise<UpdateTeamMemberRoleResult> {
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

  if (!["owner", "admin", "member"].includes(newRole)) {
    return { success: false, error: "Invalid role selection." };
  }

  const { data: actorMembership } = await supabase
    .from("bot_team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!actorMembership || actorMembership.role !== "owner") {
    return { success: false, error: "Only owners can change member roles." };
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

  if (targetMembership.role === newRole) {
    return { success: true, updatedRole: newRole };
  }

  if (
    targetMembership.role === "owner" &&
    newRole !== "owner" &&
    (await countOwners(supabase, teamId)) <= 1
  ) {
    return {
      success: false,
      error: "You must keep at least one owner on the team.",
    };
  }

  if (targetMembership.user_id === user.id && newRole !== "owner") {
    const ownerCount = await countOwners(supabase, teamId);
    if (ownerCount <= 1) {
      return {
        success: false,
        error:
          "You cannot demote yourself because you are the last owner. Promote another owner first.",
      };
    }
  }

  const { error: updateError } = await supabase
    .from("bot_team_members")
    .update({ role: newRole })
    .eq("id", memberId)
    .eq("team_id", teamId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await logAuditEvent({
    teamId,
    userId: user.id,
    action: AUDIT_ACTION.UPDATE,
    resourceType: AUDIT_RESOURCE.TEAM_MEMBER,
    resourceId: memberId,
    metadata: {
      previousRole: targetMembership.role,
      updatedRole: newRole,
      targetUserId: targetMembership.user_id,
    },
  });

  return { success: true, updatedRole: newRole };
}

