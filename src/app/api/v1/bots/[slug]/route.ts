// src/app/api/v1/bots/[slug]/route.ts
// Public API endpoint for bot details by slug

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

// GET /api/v1/bots/:slug - Get bot details by slug
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const corsHeaders = getCorsHeaders(req);
  const { slug } = await params;

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

  const adminClient = createAdminClient();

  // Get bot by slug and verify it belongs to the same team as the API key
  const { data: bot, error } = await adminClient
    .from("bot_bots")
    .select("id, name, slug, description, system_prompt, status, created_at")
    .eq("slug", slug)
    .eq("team_id", keyData.team_id)
    .eq("status", "active")
    .single();

  if (error || !bot) {
    const errorResponse = NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Bot not found or inactive",
        },
      },
      { status: 404 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  const response = NextResponse.json({ bot });
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
