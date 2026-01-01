import { NextResponse } from "next/server";
import { z } from "zod";

import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";
import {
  createErrorResponse,
  ErrorCode,
  getErrorStatus,
} from "@/lib/utils/error-responses";
import type { TeamRole } from "@/types/teams";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import {
  getTeamPlanDetails,
  resolveTeamSeatLimit,
} from "@/lib/teams/usage";

const acceptSchema = z.object({
  token: z.string().min(16),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const response = createErrorResponse(
      ErrorCode.UNAUTHORIZED,
      "You must be signed in to accept an invite."
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

  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    const response = createErrorResponse(
      ErrorCode.INVALID_INPUT,
      "Invalid token provided."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.INVALID_INPUT),
    });
  }

  const admin = createAdminClient();

  const { data: invite, error: inviteError } = await admin
    .from("bot_team_invites")
    .select("id, team_id, email, role, expires_at, accepted_at, cancelled_at")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (inviteError) {
    console.error("[team:invites:accept] Failed to load invite", {
      token: parsed.data.token,
      error: inviteError,
    });
    const response = createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      "Failed to load invite."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.DATABASE_ERROR),
    });
  }

  if (!invite) {
    const response = createErrorResponse(
      ErrorCode.NOT_FOUND,
      "Invite not found."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.NOT_FOUND),
    });
  }

  if (invite.accepted_at) {
    const response = createErrorResponse(
      ErrorCode.CONFLICT,
      "This invite has already been accepted."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.CONFLICT),
    });
  }

  if (invite.cancelled_at) {
    const response = createErrorResponse(
      ErrorCode.CONFLICT,
      "This invite has been cancelled."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.CONFLICT),
    });
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    const response = createErrorResponse(
      ErrorCode.CONFLICT,
      "This invite has expired."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.CONFLICT),
    });
  }

  const normalizedInviteEmail = invite.email.toLowerCase();
  const normalizedUserEmail = (user.email ?? "").toLowerCase();

  if (normalizedInviteEmail !== normalizedUserEmail) {
    const response = createErrorResponse(
      ErrorCode.FORBIDDEN,
      `This invite was sent to ${invite.email}. You're signed in as ${user.email}.`
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.FORBIDDEN),
    });
  }

  const { data: membership } = await admin
    .from("bot_team_members")
    .select("id, role")
    .eq("team_id", invite.team_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    const planDetails = await getTeamPlanDetails(invite.team_id);
    const seatLimit = resolveTeamSeatLimit(
      planDetails.plan,
      planDetails.extraSeats,
      planDetails.seatLimitOverride
    );

    if (seatLimit !== null) {
      const { count: memberCount } = await admin
        .from("bot_team_members")
        .select("id", { count: "exact", head: true })
        .eq("team_id", invite.team_id);

      const activeMembers = memberCount ?? 0;
      if (activeMembers >= seatLimit) {
        const response = createErrorResponse(
          ErrorCode.FORBIDDEN,
          "Team seat limit reached. Ask an admin to upgrade seats."
        );
        return NextResponse.json(response, {
          status: getErrorStatus(ErrorCode.FORBIDDEN),
        });
      }
    }
  }

  const desiredRole = invite.role === "admin" ? "admin" : "member";
  let finalRole: TeamRole = desiredRole;

  if (membership?.role === "owner") {
    finalRole = "owner";
  } else if (membership?.role === "admin") {
    finalRole = "admin";
  } else if (membership?.role === "member" && desiredRole === "admin") {
    finalRole = "admin";
  }

  if (membership) {
    if (membership.role !== finalRole) {
      const { error: updateRoleError } = await admin
        .from("bot_team_members")
        .update({ role: finalRole })
        .eq("id", membership.id);
      if (updateRoleError) {
        console.error("[team:invites:accept] Failed to update member role", {
          membershipId: membership.id,
          error: updateRoleError,
        });
        const response = createErrorResponse(
          ErrorCode.DATABASE_ERROR,
          "Failed to update existing membership."
        );
        return NextResponse.json(response, {
          status: getErrorStatus(ErrorCode.DATABASE_ERROR),
        });
      }
    }
  } else {
    const { error: insertError } = await admin.from("bot_team_members").insert({
      team_id: invite.team_id,
      user_id: user.id,
      role: finalRole,
    });
    if (insertError) {
      console.error("[team:invites:accept] Failed to create membership", {
        teamId: invite.team_id,
        userId: user.id,
        error: insertError,
      });
      const response = createErrorResponse(
        ErrorCode.DATABASE_ERROR,
        "Failed to add you to the team."
      );
      return NextResponse.json(response, {
        status: getErrorStatus(ErrorCode.DATABASE_ERROR),
      });
    }
  }

  const { error: markAcceptedError } = await admin
    .from("bot_team_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (markAcceptedError) {
    console.error("[team:invites:accept] Failed to mark invite as accepted", {
      inviteId: invite.id,
      error: markAcceptedError,
    });
    const response = createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      "Failed to update invite status."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.DATABASE_ERROR),
    });
  }

  await logAuditEvent({
    teamId: invite.team_id,
    userId: user.id,
    action: AUDIT_ACTION.UPDATE,
    resourceType: AUDIT_RESOURCE.TEAM_INVITE,
    resourceId: invite.id,
    metadata: {
      accepted: true,
      roleGranted: finalRole,
    },
  });

  return NextResponse.json(
    { success: true, teamId: invite.team_id },
    { status: 200 }
  );
}
