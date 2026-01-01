// src/app/api/v1/documents/[id]/route.ts
// Public API endpoint for individual document operations

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

// GET /api/v1/documents/:id - Get document details
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
  const { data: document, error } = await adminClient
    .from("bot_documents")
    .select("id, title, content, tags, created_at, is_global, canonical_url")
    .eq("id", id)
    .eq("team_id", keyData.team_id)
    .single();

  if (error || !document) {
    const errorResponse = NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Document not found",
        },
      },
      { status: 404 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  const response = NextResponse.json({ document });
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// PUT /api/v1/documents/:id - Update document
export async function PUT(
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

  let body: {
    title?: string;
    content?: string;
    tags?: string[];
    languageOverride?: string | null;
    translationGroupId?: string | null;
  } | null = null;

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

  if (!body) {
    const errorResponse = NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: "Request body is required" } },
      { status: 400 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  const adminClient = createAdminClient();

  // Check document exists and belongs to team
  const { data: existing, error: checkError } = await adminClient
    .from("bot_documents")
    .select("id")
    .eq("id", id)
    .eq("team_id", keyData.team_id)
    .single();

  if (checkError || !existing) {
    const errorResponse = NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Document not found",
        },
      },
      { status: 404 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  // Check document content for moderation flags if content is being updated
  let isFlagged: boolean | undefined = undefined;
  if (body.content !== undefined) {
    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const ipAddress =
      forwardedFor.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    isFlagged = await checkDocumentContent(body.content, {
      userId: undefined, // API keys don't have user_id
      teamId: keyData.team_id,
      botId: keyData.bot_id,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    });
  }

  // Update document
  const updateData: {
    title?: string;
    content?: string;
    tags?: string[];
    is_flagged?: boolean;
    language_override?: string | null;
    translation_group_id?: string | null;
  } = {};

  if (body.title !== undefined) updateData.title = body.title;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.tags !== undefined) updateData.tags = body.tags;
  if (body.languageOverride !== undefined) {
    const override = body.languageOverride?.trim();
    updateData.language_override = override
      ? normalizeLanguageTag(override)
      : null;
  }
  if (body.translationGroupId !== undefined) {
    updateData.translation_group_id = body.translationGroupId || null;
  }
  // Update is_flagged if content was checked
  if (isFlagged !== undefined) {
    updateData.is_flagged = isFlagged;
  }

  const { data: document, error: updateError } = await adminClient
    .from("bot_documents")
    .update(updateData)
    .eq("id", id)
    .select("id, title, content, tags, created_at, is_global, canonical_url, is_flagged")
    .single();

  if (updateError || !document) {
    const errorResponse = NextResponse.json(
      {
        error: {
          code: "UPDATE_ERROR",
          message: updateError?.message || "Failed to update document",
        },
      },
      { status: 500 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  // If content changed, trigger re-ingestion
  if (body.content !== undefined) {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/documents/ingest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-embedding-worker-secret":
              process.env.EMBEDDING_WORKER_SECRET || "",
          },
          body: JSON.stringify({ documentId: id }),
        }
      ).catch(() => {
        // Non-fatal
      });
    } catch {
      // Non-fatal
    }
  }

  const response = NextResponse.json({ document });
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// DELETE /api/v1/documents/:id - Delete document
export async function DELETE(
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

  const adminClient = createAdminClient();

  // Check document exists and belongs to team
  const { data: existing, error: checkError } = await adminClient
    .from("bot_documents")
    .select("id")
    .eq("id", id)
    .eq("team_id", keyData.team_id)
    .single();

  if (checkError || !existing) {
    const errorResponse = NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Document not found",
        },
      },
      { status: 404 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  // Delete document (cascade will handle chunks, embeddings, jobs)
  const { error: deleteError } = await adminClient
    .from("bot_documents")
    .delete()
    .eq("id", id);

  if (deleteError) {
    const errorResponse = NextResponse.json(
      {
        error: {
          code: "DELETE_ERROR",
          message: deleteError.message || "Failed to delete document",
        },
      },
      { status: 500 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  const response = NextResponse.json({ success: true });
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
