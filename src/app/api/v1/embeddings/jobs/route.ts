// src/app/api/v1/embeddings/jobs/route.ts
// Public API endpoint for embedding job management

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

// GET /api/v1/embeddings/jobs - List embedding jobs
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

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("document_id");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const adminClient = createAdminClient();

  let query = adminClient
    .from("bot_embedding_jobs")
    .select(
      "id, status, attempts, error, created_at, updated_at, locked_at, bot_doc_chunks!inner(document_id)"
    )
    .eq("team_id", keyData.team_id);

  // Filter by document if provided
  if (documentId) {
    query = query.eq("bot_doc_chunks.document_id", documentId);
  }

  // Filter by status if provided
  if (status && ["pending", "processing", "completed", "failed"].includes(status)) {
    query = query.eq("status", status);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1).order("created_at", {
    ascending: false,
  });

  const { data: jobs, error } = await query;

  if (error) {
    const errorResponse = NextResponse.json(
      {
        error: {
          code: "DATABASE_ERROR",
          message: error.message,
        },
      },
      { status: 500 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  // Format response
  const formattedJobs = (jobs || []).map((job: any) => {
    const chunk = Array.isArray(job.bot_doc_chunks)
      ? job.bot_doc_chunks[0]
      : job.bot_doc_chunks;
    return {
      id: job.id,
      document_id: chunk?.document_id,
      status: job.status,
      attempts: job.attempts,
      error: job.error,
      created_at: job.created_at,
      updated_at: job.updated_at,
      locked_at: job.locked_at,
    };
  });

  const response = NextResponse.json({
    jobs: formattedJobs,
    pagination: {
      limit,
      offset,
      total: formattedJobs.length,
    },
  });

  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
