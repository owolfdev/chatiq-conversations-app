import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";
import { sendTeamInviteEmail } from "@/lib/email/send-team-invite";
import { env } from "@/lib/env";
import { getAppUrl } from "@/lib/email/get-app-url";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import {
  createErrorResponse,
  ErrorCode,
  getErrorStatus,
} from "@/lib/utils/error-responses";
import type { TeamInviteSummary, TeamRole } from "@/types/teams";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getTeamPlanDetails,
  resolveTeamSeatLimit,
} from "@/lib/teams/usage";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function getMembershipRole(
  supabase: SupabaseClient,
  teamId: string,
  userId: string
): Promise<TeamRole | null> {
  const { data } = await supabase
    .from("bot_team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data?.role as TeamRole) ?? null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const response = createErrorResponse(
      ErrorCode.UNAUTHORIZED,
      "You must be signed in to view invites."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.UNAUTHORIZED),
    });
  }

  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    const response = createErrorResponse(
      ErrorCode.FORBIDDEN,
      "No team found for the current user."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.FORBIDDEN),
    });
  }

  const role = await getMembershipRole(supabase, teamId, user.id);
  if (!role || (role !== "owner" && role !== "admin")) {
    const response = createErrorResponse(
      ErrorCode.FORBIDDEN,
      "You need admin access to view team invites."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.FORBIDDEN),
    });
  }

  const { data: invites, error } = await supabase
    .from("bot_team_invites")
    .select("id, email, role, created_at, expires_at")
    .eq("team_id", teamId)
    .is("accepted_at", null)
    .is("cancelled_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[team:invites] Failed to load invites", {
      teamId,
      error,
    });
    const response = createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      "Failed to load team invites."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.DATABASE_ERROR),
    });
  }

  const payload: TeamInviteSummary[] =
    invites?.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      sentAt: invite.created_at,
      expiresAt: invite.expires_at,
    })) ?? [];

  return NextResponse.json({ invites: payload }, { status: 200 });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const response = createErrorResponse(
      ErrorCode.UNAUTHORIZED,
      "You must be signed in to invite teammates."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.UNAUTHORIZED),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const response = createErrorResponse(
      ErrorCode.INVALID_INPUT,
      "Invalid JSON payload."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.INVALID_INPUT),
    });
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    const response = createErrorResponse(
      ErrorCode.INVALID_INPUT,
      "Invalid invite parameters.",
      parsed.error.flatten().fieldErrors
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.INVALID_INPUT),
    });
  }

  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    const response = createErrorResponse(
      ErrorCode.FORBIDDEN,
      "No team found for the current user."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.FORBIDDEN),
    });
  }

  const role = await getMembershipRole(supabase, teamId, user.id);
  if (!role || (role !== "owner" && role !== "admin")) {
    const response = createErrorResponse(
      ErrorCode.FORBIDDEN,
      "You need admin access to invite teammates."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.FORBIDDEN),
    });
  }

  const planDetails = await getTeamPlanDetails(teamId);
  if (!["team", "enterprise", "admin"].includes(planDetails.plan)) {
    const response = createErrorResponse(
      ErrorCode.FORBIDDEN,
      "Upgrade to Business to invite teammates."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.FORBIDDEN),
    });
  }

  const seatLimit = resolveTeamSeatLimit(
    planDetails.plan,
    planDetails.extraSeats,
    planDetails.seatLimitOverride
  );

  if (seatLimit !== null) {
    const admin = createAdminClient();
    const [{ count: memberCount }, { count: pendingInviteCount }] =
      await Promise.all([
        admin
          .from("bot_team_members")
          .select("id", { count: "exact", head: true })
          .eq("team_id", teamId),
        admin
          .from("bot_team_invites")
          .select("id", { count: "exact", head: true })
          .eq("team_id", teamId)
          .is("accepted_at", null)
          .is("cancelled_at", null),
      ]);

    const activeMembers = memberCount ?? 0;
    const pendingInvites = pendingInviteCount ?? 0;
    if (activeMembers + pendingInvites >= seatLimit) {
      const response = createErrorResponse(
        ErrorCode.FORBIDDEN,
        "Team seat limit reached. Upgrade to add more teammates."
      );
      return NextResponse.json(response, {
        status: getErrorStatus(ErrorCode.FORBIDDEN),
      });
    }
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);

  const { data: team } = await supabase
    .from("bot_teams")
    .select("name")
    .eq("id", teamId)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("bot_user_profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const inviterName =
    profile?.full_name?.trim() || user.user_metadata?.full_name || user.email;

  const token = randomUUID().replace(/-/g, "");

  const { data: invite, error: insertError } = await supabase
    .from("bot_team_invites")
    .insert({
      team_id: teamId,
      email: normalizedEmail,
      role: parsed.data.role,
      inviter_id: user.id,
      token,
    })
    .select("id, email, role, created_at, expires_at, token")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const response = createErrorResponse(
        ErrorCode.CONFLICT,
        "An active invite already exists for this email."
      );
      return NextResponse.json(response, {
        status: getErrorStatus(ErrorCode.CONFLICT),
      });
    }

    console.error("[team:invites] Failed to create invite", {
      teamId,
      userId: user.id,
      error: insertError,
    });
    const response = createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      "Failed to create invite."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.DATABASE_ERROR),
    });
  }

  const appUrl = getAppUrl();
  const inviteUrl = `${appUrl.replace(/\/$/, "")}/invite/${
    invite.token
  }`;

  try {
    await sendTeamInviteEmail({
      email: invite.email,
      teamName: team?.name ?? "your team",
      inviterName: inviterName ?? "A teammate",
      inviteUrl,
      role: invite.role,
      expiresAt: invite.expires_at,
    });
  } catch (emailError) {
    console.error("[team:invites] Failed to send invite email", {
      inviteId: invite.id,
      emailError,
    });
    await supabase.from("bot_team_invites").delete().eq("id", invite.id);
    // Surface generic error
    const response = createErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      "Invite was created but email delivery failed. Please try again."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.INTERNAL_SERVER_ERROR),
    });
  }

  await logAuditEvent({
    teamId,
    userId: user.id,
    action: AUDIT_ACTION.CREATE,
    resourceType: AUDIT_RESOURCE.TEAM_INVITE,
    resourceId: invite.id,
    metadata: {
      email: invite.email,
      role: invite.role,
    },
  });

  const payload: TeamInviteSummary = {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    sentAt: invite.created_at,
    expiresAt: invite.expires_at,
  };

  return NextResponse.json({ invite: payload }, { status: 201 });
}
