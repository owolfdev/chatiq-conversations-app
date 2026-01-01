import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import {
  createErrorResponse,
  ErrorCode,
  getErrorStatus,
} from "@/lib/utils/error-responses";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const response = createErrorResponse(
      ErrorCode.UNAUTHORIZED,
      "You must be signed in to view import jobs."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.UNAUTHORIZED),
    });
  }

  const { id: jobId } = await params;
  if (!jobId) {
    const response = createErrorResponse(
      ErrorCode.INVALID_INPUT,
      "Job ID is required."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.INVALID_INPUT),
    });
  }

  const { data: job, error: jobError } = await supabase
    .from("bot_document_import_jobs")
    .select(
      "id, status, total_count, processed_count, success_count, failure_count, base_url, created_at"
    )
    .eq("id", jobId)
    .maybeSingle();

  if (jobError || !job) {
    const response = createErrorResponse(
      ErrorCode.NOT_FOUND,
      "Import job not found."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.NOT_FOUND),
    });
  }

  const { data: failedItems } = await supabase
    .from("bot_document_import_items")
    .select("id, url, error")
    .eq("job_id", jobId)
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    job: {
      id: job.id,
      status: job.status,
      totalCount: job.total_count,
      processedCount: job.processed_count,
      successCount: job.success_count,
      failureCount: job.failure_count,
      baseUrl: job.base_url,
      createdAt: job.created_at,
    },
    failedItems: failedItems ?? [],
  });
}
