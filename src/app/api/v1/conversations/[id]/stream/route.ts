// src/app/api/v1/conversations/[id]/stream/route.ts
// Public SSE stream for conversation messages (API key auth)

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsHeaders = getCorsHeaders(req);
  const { id } = await params;

  const url = new URL(req.url);
  const queryApiKey = url.searchParams.get("api_key") || undefined;
  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : queryApiKey;

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

  const encoder = new TextEncoder();
  const streamController = new TransformStream();
  const writer = streamController.writable.getWriter();
  let closed = false;

  const sendEvent = async (data: unknown) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const closeStream = async () => {
    if (closed) return;
    closed = true;
    clearInterval(pollInterval);
    clearInterval(pingInterval);
    try {
      await writer.close();
    } catch (error) {
      // Ignore close errors on client disconnects
    }
  };

  req.signal.addEventListener("abort", () => {
    void closeStream();
  });

  const { data: latestMessage } = await adminClient
    .from("bot_messages")
    .select("id, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let lastSeenAt: string | null =
    typeof latestMessage?.created_at === "string"
      ? latestMessage.created_at
      : null;
  let seenIds = new Set<string>();
  if (latestMessage?.id) {
    seenIds.add(latestMessage.id);
  }

  const poll = async () => {
    if (closed) return;
    let query = adminClient
      .from("bot_messages")
      .select("id, sender, content, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (lastSeenAt) {
      query = query.gte("created_at", lastSeenAt);
    }

    const { data: rows } = await query;
    if (!rows || !rows.length) {
      return;
    }

    for (const row of rows) {
      if (!row?.id || seenIds.has(row.id)) {
        continue;
      }
      seenIds.add(row.id);
      if (typeof row.created_at === "string") {
        lastSeenAt = row.created_at;
      }
      await sendEvent({ message: row });
    }

    if (seenIds.size > 1000) {
      seenIds = new Set(Array.from(seenIds).slice(-200));
    }
  };

  const pollInterval = setInterval(poll, 2000);
  const pingInterval = setInterval(() => {
    if (closed) return;
    void sendEvent({ ping: Date.now() });
  }, 15000);

  void poll();

  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    ...corsHeaders,
  };

  return new Response(streamController.readable, { headers });
}
