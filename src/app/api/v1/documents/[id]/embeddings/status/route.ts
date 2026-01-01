// src/app/api/v1/documents/[id]/embeddings/status/route.ts
// Public API endpoint for document embedding status

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

// GET /api/v1/documents/:id/embeddings/status - Get embedding status for document
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsHeaders = getCorsHeaders(req);
  const { id: documentId } = await params;

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

  // Verify document exists and belongs to team
  const { data: document, error: docError } = await adminClient
    .from("bot_documents")
    .select("id, team_id")
    .eq("id", documentId)
    .eq("team_id", keyData.team_id)
    .single();

  if (docError || !document) {
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

  // Get all chunks for this document
  const { data: chunks, error: chunksError } = await adminClient
    .from("bot_doc_chunks")
    .select("id")
    .eq("document_id", documentId);

  if (chunksError) {
    const errorResponse = NextResponse.json(
      {
        error: {
          code: "DATABASE_ERROR",
          message: chunksError.message,
        },
      },
      { status: 500 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  const chunkIds = (chunks || []).map((c) => c.id);

  if (chunkIds.length === 0) {
    const response = NextResponse.json({
      document_id: documentId,
      status: "not_started",
      progress: {
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      },
      percentage: 0,
    });
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Get embedding job statuses
  const { data: jobs, error: jobsError } = await adminClient
    .from("bot_embedding_jobs")
    .select("status, error, created_at, updated_at")
    .in("chunk_id", chunkIds);

  if (jobsError) {
    const errorResponse = NextResponse.json(
      {
        error: {
          code: "DATABASE_ERROR",
          message: jobsError.message,
        },
      },
      { status: 500 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  const total = chunkIds.length;
  const pending = (jobs || []).filter((j) => j.status === "pending").length;
  const processing = (jobs || []).filter((j) => j.status === "processing")
    .length;
  const completed = (jobs || []).filter((j) => j.status === "completed")
    .length;
  const failed = (jobs || []).filter((j) => j.status === "failed").length;

  // Determine overall status
  let status: "processing" | "completed" | "failed" | "pending" = "pending";
  if (completed === total) {
    status = "completed";
  } else if (failed > 0 && pending === 0 && processing === 0) {
    status = "failed";
  } else if (pending > 0 || processing > 0) {
    status = "processing";
  }

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Get failed job errors
  const failedJobs = (jobs || [])
    .filter((j) => j.status === "failed")
    .map((j) => ({
      error: j.error || "Unknown error",
      created_at: j.created_at,
    }));

  const response = NextResponse.json({
    document_id: documentId,
    status,
    progress: {
      total,
      pending,
      processing,
      completed,
      failed,
    },
    percentage,
    failed_jobs: failed > 0 ? failedJobs : undefined,
  });

  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
