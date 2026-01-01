import { redirect } from "next/navigation";

import TeamManagementClient from "@/app/(app)/dashboard/team/team-management-client";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import {
  getTeamPlanDetails,
  resolveTeamSeatLimit,
  type PlanId,
} from "@/lib/teams/usage";
import type {
  TeamInviteSummary,
  TeamMemberSummary,
  TeamRole,
} from "@/types/teams";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team",
};

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in?redirect=/dashboard/team");
  }

  const sessionUser = user;

  const teamId = await getUserTeamId(sessionUser.id);
  if (!teamId) {
    redirect("/not-authorized");
  }

  const { data: membership } = await supabase
    .from("bot_team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", sessionUser.id)
    .maybeSingle();

  if (!membership) {
    redirect("/not-authorized");
  }

  const currentRole = membership.role as TeamRole;
  const admin = createAdminClient();

const { data: memberRows, error: membersError } = await admin
    .from("bot_team_members")
    .select(
      `
        id,
        user_id,
        role,
        created_at,
        user:bot_user_profiles!bot_team_members_user_id_fkey (
          full_name,
          email,
          avatar_url
        )
      `
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  if (membersError) {
    throw new Error(
      `Failed to load team members: ${membersError.message ?? "Unknown error"}`
    );
  }

type MemberRow = {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  user: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

const typedMemberRows: MemberRow[] = (memberRows ?? []).map((member: any) => ({
  id: member.id,
  user_id: member.user_id,
  role: member.role,
  created_at: member.created_at,
  user: Array.isArray(member.user)
    ? member.user[0] ?? null
    : member.user ?? null,
}));

  const members: TeamMemberSummary[] = typedMemberRows.map((member) => ({
    id: member.id,
    userId: member.user_id,
    name: member.user?.full_name ?? null,
    email: member.user?.email ?? "unknown@example.com",
    role: member.role as TeamRole,
    joinedAt: member.created_at,
    avatarUrl: member.user?.avatar_url ?? null,
  }));

  let invites: TeamInviteSummary[] = [];
  if (currentRole === "owner" || currentRole === "admin") {
    const { data: inviteRows, error: invitesError } = await admin
      .from("bot_team_invites")
      .select("id, email, role, created_at, expires_at")
      .eq("team_id", teamId)
      .is("accepted_at", null)
      .is("cancelled_at", null)
      .order("created_at", { ascending: false });

    if (invitesError) {
      throw new Error(
        `Failed to load team invites: ${invitesError.message ?? "Unknown error"}`
      );
    }

    invites =
      inviteRows?.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        sentAt: invite.created_at,
        expiresAt: invite.expires_at,
      })) ?? [];
  }

  const { data: team } = await admin
    .from("bot_teams")
    .select("name")
    .eq("id", teamId)
    .maybeSingle();

  const planDetails = await getTeamPlanDetails(teamId);
  const seatLimit = resolveTeamSeatLimit(
    planDetails.plan,
    planDetails.extraSeats,
    planDetails.seatLimitOverride
  );

  return (
    <TeamManagementClient
      teamId={teamId}
      currentUserId={sessionUser.id}
      currentUserRole={currentRole}
      planId={planDetails.plan as PlanId}
      seatLimit={seatLimit}
      initialMembers={members}
      initialInvites={invites}
      canManageTeamProfile={currentRole === "owner"}
      initialTeamName={team?.name ?? "My Team"}
    />
  );
}
