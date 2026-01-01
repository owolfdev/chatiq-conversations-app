// src/app/api/v1/conversations/[id]/messages/route.ts
// Public API endpoint to fetch conversation messages by ID (API key auth)

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";
import { validateApiKey } from "@/lib/api/validate-api-key";

export async function OPTIONS(req: NextRequest) {
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }
  return new NextResponse(null, { status: 405 });
}

// GET /api/v1/conversations/:id/messages - Get messages by conversation id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsHeaders = getCorsHeaders(req);
  const { id } = await params;

  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!apiKey) {
    const errorResponse = NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "API key required" } },
      { status: 401 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  const keyData = await validateApiKey(apiKey);
  if (!keyData) {
    const errorResponse = NextResponse.json(
      { error: { code: "INVALID_API_KEY", message: "Invalid API key" } },
      { status: 401 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }
  if (keyData.evaluationExpired) {
    const errorResponse = NextResponse.json(
      {
        error: {
          code: "EVALUATION_EXPIRED",
          message:
            "Evaluation period ended. API access is disabled until you upgrade.",
        },
      },
      { status: 403 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  if (!id) {
    const errorResponse = NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Conversation id required" } },
      { status: 400 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  const adminClient = createAdminClient();

  const { data: conversation, error: convoError } = await adminClient
    .from("bot_conversations")
    .select("id, team_id, bot_id")
    .eq("id", id)
    .maybeSingle();

  if (convoError || !conversation) {
    const errorResponse = NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Conversation not found" } },
      { status: 404 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  if (
    conversation.team_id !== keyData.team_id ||
    conversation.bot_id !== keyData.bot_id
  ) {
    const errorResponse = NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Forbidden" } },
      { status: 403 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const sinceParam = searchParams.get("since");
  const limit = Math.min(Number(limitParam) || 200, 500);

  let messageQuery = adminClient
    .from("bot_messages")
    .select("id, sender, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (sinceParam) {
    messageQuery = messageQuery.gt("created_at", sinceParam);
  }

  const { data: messages, error: messageError } = await messageQuery;

  if (messageError || !messages) {
    const errorResponse = NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to load messages" } },
      { status: 500 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  const response = NextResponse.json({ messages });
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
