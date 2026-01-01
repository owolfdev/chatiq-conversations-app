// src/app/api/chat/route.ts
import { type NextRequest, NextResponse } from "next/server";
import {
  handleChatRequest,
  type ChatRequest,
} from "@/lib/chat/handle-chat-requests";
import { errorToResponse } from "@/lib/utils/error-responses";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";

// Handle OPTIONS preflight requests
export async function OPTIONS(req: NextRequest) {
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }
  return new NextResponse(null, { status: 405 });
}

export async function POST(req: NextRequest) {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  const corsHeaders = getCorsHeaders(req);
  let body: Record<string, unknown> = {};

  try {
    body = await req.json();
  } catch (error) {
    const { logger } = await import("@/lib/logger");
    logger.error("Failed to parse request body", error, {
      path: req.url,
      method: req.method,
    });
    const { response, status } = errorToResponse(error);
    const errorResponse = NextResponse.json(response, { status });
    // Add CORS headers even for parse errors
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const userAgent = req.headers.get("user-agent") || undefined;
  const origin = req.headers.get("origin") || req.headers.get("referer") || undefined;

  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  const { stream, ...payload } = body as Record<string, unknown> & {
    stream?: boolean;
  };

  const wantsJson = stream === false;

  if (wantsJson) {
    try {
      const result = await handleChatRequest({
        ...(payload as Omit<ChatRequest, "ip" | "apiKey" | "userAgent" | "origin">),
        ip,
        userAgent,
        apiKey,
        origin,
      } as ChatRequest);
      const response = NextResponse.json(result);
      // Add CORS headers
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    } catch (error: unknown) {
      const { logger } = await import("@/lib/logger");
      logger.error("Error in chat API route (JSON mode)", error, {
        path: req.url,
        botSlug: (payload as { bot_slug?: string }).bot_slug,
      });
      const { response, status } = errorToResponse(error);
      const errorResponse = NextResponse.json(response, { status });
      // Add CORS headers even for errors
      Object.entries(corsHeaders).forEach(([key, value]) => {
        errorResponse.headers.set(key, value);
      });
      return errorResponse;
    }
  }

  const encoder = new TextEncoder();
  const streamController = new TransformStream();
  const writer = streamController.writable.getWriter();

  let chunksStreamed = false; // Track if any chunks were streamed via onDelta

  const writeEvent = async (data: unknown) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  (async () => {
    try {
      const result = await handleChatRequest(
        {
          ...(payload as Omit<ChatRequest, "ip" | "apiKey" | "userAgent" | "origin">),
          ip,
          userAgent,
          apiKey,
          origin,
        } as ChatRequest,
        async (chunk) => {
          chunksStreamed = true; // Mark that we've streamed chunks
          await writeEvent({
            choices: [{ delta: { content: chunk } }],
          });
        }
      );

      // Fallback: If we got a complete response without streaming (edge case),
      // we need to stream it so the UI can display it
      // Note: Canned and cached responses now simulate streaming via streamCachedResponse,
      // so chunksStreamed should be true for them. This fallback handles any edge cases.
      if (result.response && !chunksStreamed) {
        // Stream the complete response as a single chunk
        // This is a fallback for any responses that didn't call onDelta
        await writeEvent({
          choices: [{ delta: { content: result.response } }],
        });
      }

      if (result.conversationId) {
        await writeEvent({ conversationId: result.conversationId });
      }

      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (error: unknown) {
      const { logger } = await import("@/lib/logger");
      logger.error("Error in chat API route (stream mode)", error, {
        path: req.url,
        botSlug: (payload as { bot_slug?: string }).bot_slug,
      });
      const { response } = errorToResponse(error);
      await writeEvent(response);
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } finally {
      await writer.close();
    }
  })().catch(async (error) => {
    const { logger } = await import("@/lib/logger");
    logger.error("Unhandled stream error", error, {
      path: req.url,
    });
  });

  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    ...corsHeaders,
  };

  return new Response(streamController.readable, {
    headers,
  });
}
