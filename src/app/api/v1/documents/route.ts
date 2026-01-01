// src/app/api/v1/documents/route.ts
// Public API endpoint for document management

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";
import { validateApiKey } from "@/lib/api/validate-api-key";
import { checkDocumentContent } from "@/lib/middleware/moderation";
import { normalizeLanguageTag } from "@/lib/language/detect-language";

export async function OPTIONS(req: NextRequest) {
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }
  return new NextResponse(null, { status: 405 });
}

// GET /api/v1/documents - List documents
export async function GET(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);

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
  const { data: documents, error } = await adminClient
    .from("bot_documents")
    .select("id, title, tags, created_at, is_global, canonical_url")
    .eq("team_id", keyData.team_id)
    .order("created_at", { ascending: false });

  if (error) {
    const errorResponse = NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: error.message } },
      { status: 500 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  const response = NextResponse.json({ documents: documents || [] });
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// POST /api/v1/documents - Create document
export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);

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

  let body:
    | {
        title: string;
        content: string;
        tags?: string[];
        languageOverride?: string;
        translationGroupId?: string;
      }
    | null = null;
  try {
    body = await req.json();
  } catch (error) {
    const errorResponse = NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  if (!body?.title || !body?.content) {
    const errorResponse = NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "title and content are required",
        },
      },
      { status: 400 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  const adminClient = createAdminClient();

  // Check document content for moderation flags
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const ipAddress =
    forwardedFor.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const userAgent = req.headers.get("user-agent") || null;

  const     isFlagged = await checkDocumentContent(body.content, {
      userId: undefined, // API keys don't have user_id
      teamId: keyData.team_id,
      botId: keyData.bot_id,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    });

  // Create document
  const languageOverride = body.languageOverride?.trim();
  const normalizedOverride = languageOverride
    ? normalizeLanguageTag(languageOverride)
    : null;

  const { data: document, error: createError } = await adminClient
    .from("bot_documents")
    .insert({
      title: body.title,
      content: body.content,
      tags: body.tags || [],
      team_id: keyData.team_id,
      is_global: false,
      is_flagged: isFlagged,
      language_override: normalizedOverride,
      translation_group_id: body.translationGroupId ?? null,
    })
    .select("id, title, tags, created_at, is_global, canonical_url, is_flagged")
    .single();

  if (createError || !document) {
    const errorResponse = NextResponse.json(
      {
        error: {
          code: "CREATE_ERROR",
          message: createError?.message || "Failed to create document",
        },
      },
      { status: 500 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  // Trigger ingestion (queue embedding jobs)
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/documents/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-embedding-worker-secret": process.env.EMBEDDING_WORKER_SECRET || "",
      },
      body: JSON.stringify({ documentId: document.id }),
    }).catch(() => {
      // Non-fatal - ingestion will happen via background worker
    });
  } catch {
    // Non-fatal
  }

  const response = NextResponse.json({ document });
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
