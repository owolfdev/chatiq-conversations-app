import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import {
  createErrorResponse,
  ErrorCode,
  getErrorStatus,
} from "@/lib/utils/error-responses";
import { createClient } from "@/utils/supabase/server";

const providerSchema = z.enum(["line", "facebook", "whatsapp"]);

const createIntegrationSchema = z.object({
  provider: providerSchema,
  bot_id: z.string().uuid(),
  display_name: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  credentials: z.record(z.string(), z.unknown()),
});

type IntegrationCredentials = Record<string, unknown>;

type IntegrationRow = {
  id: string;
  bot_id: string;
  provider: "line" | "facebook" | "whatsapp";
  status: string;
  display_name: string | null;
  credentials: IntegrationCredentials;
  created_at: string;
  updated_at: string;
  bot_bots?: { name?: string | null; slug?: string | null } | Array<{ name?: string | null; slug?: string | null }> | null;
};

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

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const response = createErrorResponse(
      ErrorCode.UNAUTHORIZED,
      "You must be signed in to view integrations."
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

  const provider = req.nextUrl.searchParams.get("provider");

  let query = supabase
    .from("bot_integrations")
    .select(
      "id, bot_id, provider, status, display_name, credentials, created_at, updated_at, bot_bots(name, slug)"
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (provider) {
    const parsedProvider = providerSchema.safeParse(provider);
    if (!parsedProvider.success) {
      const response = createErrorResponse(
        ErrorCode.INVALID_INPUT,
        "Invalid provider filter."
      );
      return NextResponse.json(response, {
        status: getErrorStatus(ErrorCode.INVALID_INPUT),
      });
    }
    query = query.eq("provider", parsedProvider.data);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[integrations] Failed to load integrations", {
      teamId,
      error,
    });
    const response = createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      "Failed to load integrations."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.DATABASE_ERROR),
    });
  }

  const integrations = (data as IntegrationRow[] | null)?.map((row) => {
    const botRecord = Array.isArray(row.bot_bots)
      ? row.bot_bots[0]
      : row.bot_bots;

    return {
      id: row.id,
      bot_id: row.bot_id,
      provider: row.provider,
      status: row.status,
      display_name: row.display_name,
      credentials: maskCredentials(row.credentials || {}),
      created_at: row.created_at,
      updated_at: row.updated_at,
      bot: botRecord ? { name: botRecord.name, slug: botRecord.slug } : null,
    };
  }) ?? [];

  return NextResponse.json({ integrations }, { status: 200 });
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
      "You must be signed in to create integrations."
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

  const parsed = createIntegrationSchema.safeParse(body);
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

  const validationError = validateCredentials(
    parsed.data.provider,
    parsed.data.credentials
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

  const { data: bot } = await supabase
    .from("bot_bots")
    .select("id, team_id")
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

  const { data: integration, error } = await supabase
    .from("bot_integrations")
    .insert({
      team_id: teamId,
      bot_id: parsed.data.bot_id,
      provider: parsed.data.provider,
      status: parsed.data.status ?? "active",
      display_name: parsed.data.display_name ?? null,
      credentials: parsed.data.credentials,
    })
    .select(
      "id, bot_id, provider, status, display_name, credentials, created_at, updated_at"
    )
    .single();

  if (error) {
    const isConflict = error.code === "23505";
    console.error("[integrations] Failed to create integration", {
      teamId,
      error,
    });
    const response = createErrorResponse(
      isConflict ? ErrorCode.CONFLICT : ErrorCode.DATABASE_ERROR,
      isConflict
        ? "Integration already exists for this bot and provider."
        : "Failed to create integration."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(
        isConflict ? ErrorCode.CONFLICT : ErrorCode.DATABASE_ERROR
      ),
    });
  }

  return NextResponse.json(
    {
      integration: {
        id: integration.id,
        bot_id: integration.bot_id,
        provider: integration.provider,
        status: integration.status,
        display_name: integration.display_name,
        credentials: maskCredentials(integration.credentials || {}),
        created_at: integration.created_at,
        updated_at: integration.updated_at,
      },
    },
    { status: 201 }
  );
}
