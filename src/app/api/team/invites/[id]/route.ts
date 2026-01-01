import { NextRequest, NextResponse } from "next/server";

import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import {
  createErrorResponse,
  ErrorCode,
  getErrorStatus,
} from "@/lib/utils/error-responses";
import type { TeamRole } from "@/types/teams";
import { createClient } from "@/utils/supabase/server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

async function requireTeamAdminRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  userId: string
): Promise<TeamRole> {
  const { data } = await supabase
    .from("bot_team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  const role = data?.role as TeamRole | undefined;
  if (!role || (role !== "owner" && role !== "admin")) {
    throw new Error("NOT_ADMIN");
  }
  return role;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const response = createErrorResponse(
      ErrorCode.UNAUTHORIZED,
      "You must be signed in to cancel invites."
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

  try {
    await requireTeamAdminRole(supabase, teamId, user.id);
  } catch (error) {
    if ((error as Error).message === "NOT_ADMIN") {
      const response = createErrorResponse(
        ErrorCode.FORBIDDEN,
        "You need admin access to cancel invites."
      );
      return NextResponse.json(response, {
        status: getErrorStatus(ErrorCode.FORBIDDEN),
      });
    }
    throw error;
  }

  const { data: invite, error: fetchError } = await supabase
    .from("bot_team_invites")
    .select("id, email, team_id")
    .eq("id", id)
    .eq("team_id", teamId)
    .is("accepted_at", null)
    .maybeSingle();

  if (fetchError) {
    console.error("[team:invites] Failed to load invite for cancellation", {
      id,
      teamId,
      error: fetchError,
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
      "Invite not found or already processed."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.NOT_FOUND),
    });
  }

  const { error: updateError } = await supabase
    .from("bot_team_invites")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", invite.id)
    .eq("team_id", teamId);

  if (updateError) {
    console.error("[team:invites] Failed to cancel invite", {
      inviteId: invite.id,
      teamId,
      error: updateError,
    });
    const response = createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      "Failed to cancel invite."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.DATABASE_ERROR),
    });
  }

  await logAuditEvent({
    teamId,
    userId: user.id,
    action: AUDIT_ACTION.DELETE,
    resourceType: AUDIT_RESOURCE.TEAM_INVITE,
    resourceId: invite.id,
    metadata: {
      email: invite.email,
      cancelled: true,
    },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
