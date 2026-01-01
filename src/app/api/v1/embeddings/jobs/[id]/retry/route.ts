// src/app/api/v1/embeddings/jobs/[id]/retry/route.ts
// Public API endpoint to retry failed embedding jobs

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

// POST /api/v1/embeddings/jobs/:id/retry - Retry a failed embedding job
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsHeaders = getCorsHeaders(req);
  const { id: jobId } = await params;

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

  // Check job exists and belongs to team
  const { data: job, error: jobError } = await adminClient
    .from("bot_embedding_jobs")
    .select("id, status, team_id")
    .eq("id", jobId)
    .eq("team_id", keyData.team_id)
    .single();

  if (jobError || !job) {
    const errorResponse = NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Job not found",
        },
      },
      { status: 404 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  // Only allow retrying failed jobs
  if (job.status !== "failed") {
    const errorResponse = NextResponse.json(
      {
        error: {
          code: "INVALID_STATUS",
          message: `Cannot retry job with status: ${job.status}. Only failed jobs can be retried.`,
        },
      },
      { status: 400 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  // Reset job to pending
  const { data: updatedJob, error: updateError } = await adminClient
    .from("bot_embedding_jobs")
    .update({
      status: "pending",
      attempts: 0,
      error: null,
      locked_at: null,
      locked_by: null,
    })
    .eq("id", jobId)
    .select("id, status")
    .single();

  if (updateError || !updatedJob) {
    const errorResponse = NextResponse.json(
      {
        error: {
          code: "UPDATE_ERROR",
          message: updateError?.message || "Failed to retry job",
        },
      },
      { status: 500 }
    );
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }

  const response = NextResponse.json({
    success: true,
    job: {
      id: updatedJob.id,
      status: updatedJob.status,
    },
  });

  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
