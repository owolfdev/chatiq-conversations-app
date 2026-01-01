import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import {
  createErrorResponse,
  ErrorCode,
  getErrorStatus,
} from "@/lib/utils/error-responses";
import { createClient } from "@/utils/supabase/server";

const updateIntegrationSchema = z.object({
  bot_id: z.string().uuid().optional(),
  display_name: z.string().trim().min(1).max(120).optional().nullable(),
  status: z.enum(["active", "disabled"]).optional(),
  credentials: z.record(z.string(), z.unknown()).optional(),
});

type IntegrationCredentials = Record<string, unknown>;

function maskCredentials(
  credentials: IntegrationCredentials
): IntegrationCredentials {
  const masked: IntegrationCredentials = {};
  Object.entries(credentials || {}).forEach(([key, value]) => {
    if (typeof value === "string" && /secret|token/i.test(key)) {
      const last4 = value.slice(-4);
      masked[key] = `****${last4}`;
      return;
    }
    masked[key] = value;
  });
  return masked;
}

function validateCredentials(
  provider: "line" | "facebook" | "whatsapp",
  credentials: IntegrationCredentials
): string | null {
  if (provider === "line") {
    const channelId = credentials.channel_id;
    const channelSecret = credentials.channel_secret;
    const channelAccessToken = credentials.channel_access_token;
    if (!channelId || typeof channelId !== "string") {
      return "channel_id is required for LINE integrations.";
    }
    if (!channelSecret || typeof channelSecret !== "string") {
      return "channel_secret is required for LINE integrations.";
    }
    if (!channelAccessToken || typeof channelAccessToken !== "string") {
      return "channel_access_token is required for LINE integrations.";
    }
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const response = createErrorResponse(
      ErrorCode.UNAUTHORIZED,
      "You must be signed in to update integrations."
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

  const parsed = updateIntegrationSchema.safeParse(body);
  if (!parsed.success) {
    const response = createErrorResponse(
      ErrorCode.INVALID_INPUT,
      "Invalid integration parameters.",
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

  const { id } = await params;

  const { data: integration, error: fetchError } = await supabase
    .from("bot_integrations")
    .select(
      "id, team_id, bot_id, provider, status, display_name, credentials, created_at, updated_at"
    )
    .eq("id", id)
    .eq("team_id", teamId)
    .single();

  if (fetchError || !integration) {
    const response = createErrorResponse(
      ErrorCode.NOT_FOUND,
      "Integration not found."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.NOT_FOUND),
    });
  }

  if (parsed.data.bot_id) {
    const { data: bot } = await supabase
      .from("bot_bots")
      .select("id")
      .eq("id", parsed.data.bot_id)
      .eq("team_id", teamId)
      .maybeSingle();

    if (!bot) {
      const response = createErrorResponse(
        ErrorCode.BOT_NOT_FOUND,
        "Bot not found for the current team."
      );
      return NextResponse.json(response, {
        status: getErrorStatus(ErrorCode.BOT_NOT_FOUND),
      });
    }
  }

  let mergedCredentials = integration.credentials || {};
  if (parsed.data.credentials) {
    mergedCredentials = {
      ...mergedCredentials,
      ...parsed.data.credentials,
    };
  }

  const validationError = validateCredentials(
    integration.provider,
    mergedCredentials
  );
  if (validationError) {
    const response = createErrorResponse(
      ErrorCode.INVALID_INPUT,
      validationError
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.INVALID_INPUT),
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from("bot_integrations")
    .update({
      bot_id: parsed.data.bot_id ?? integration.bot_id,
      status: parsed.data.status ?? integration.status,
      display_name:
        parsed.data.display_name === undefined
          ? integration.display_name
          : parsed.data.display_name,
      credentials: mergedCredentials,
      updated_at: new Date().toISOString(),
    })
    .eq("id", integration.id)
    .select(
      "id, bot_id, provider, status, display_name, credentials, created_at, updated_at"
    )
    .single();

  if (updateError || !updated) {
    console.error("[integrations] Failed to update integration", {
      teamId,
      integrationId: integration.id,
      error: updateError,
    });
    const response = createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      "Failed to update integration."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.DATABASE_ERROR),
    });
  }

  return NextResponse.json(
    {
      integration: {
        id: updated.id,
        bot_id: updated.bot_id,
        provider: updated.provider,
        status: updated.status,
        display_name: updated.display_name,
        credentials: maskCredentials(updated.credentials || {}),
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      },
    },
    { status: 200 }
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const response = createErrorResponse(
      ErrorCode.UNAUTHORIZED,
      "You must be signed in to delete integrations."
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

  const { id } = await params;

  const { error: deleteError } = await supabase
    .from("bot_integrations")
    .delete()
    .eq("id", id)
    .eq("team_id", teamId);

  if (deleteError) {
    console.error("[integrations] Failed to delete integration", {
      teamId,
      integrationId: id,
      error: deleteError,
    });
    const response = createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      "Failed to delete integration."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.DATABASE_ERROR),
    });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
