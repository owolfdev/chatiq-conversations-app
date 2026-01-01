import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { processDocumentImportJob } from "@/lib/documents/process-document-import-jobs";
import {
  createErrorResponse,
  ErrorCode,
  getErrorStatus,
} from "@/lib/utils/error-responses";

interface ProcessPayload {
  jobId: string;
  batchSize?: number;
}

function isValidPayload(payload: unknown): payload is ProcessPayload {
  if (!payload || typeof payload !== "object") return false;
  const body = payload as Record<string, unknown>;
  if (typeof body.jobId !== "string" || body.jobId.trim().length === 0) {
    return false;
  }
  if (body.batchSize !== undefined && typeof body.batchSize !== "number") {
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const response = createErrorResponse(
      ErrorCode.UNAUTHORIZED,
      "You must be signed in to process import jobs."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.UNAUTHORIZED),
    });
  }

  let payload: ProcessPayload | null = null;
  try {
    const raw = await request.json();
    if (!isValidPayload(raw)) {
      throw new Error("Invalid process payload");
    }
    payload = raw;
  } catch (error) {
    console.error("[documents:import-jobs] Invalid request payload", error);
    const response = createErrorResponse(
      ErrorCode.INVALID_INPUT,
      "Invalid process payload"
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.INVALID_INPUT),
    });
  }

  const { data: job } = await supabase
    .from("bot_document_import_jobs")
    .select("id")
    .eq("id", payload.jobId)
    .maybeSingle();

  if (!job) {
    const response = createErrorResponse(
      ErrorCode.NOT_FOUND,
      "Import job not found."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.NOT_FOUND),
    });
  }

  const summary = await processDocumentImportJob({
    jobId: payload.jobId,
    batchSize: Math.min(payload.batchSize ?? 5, 10),
    workerId: `user-${user.id}`,
  });

  if (!summary) {
    const response = createErrorResponse(
      ErrorCode.NOT_FOUND,
      "Import job not found."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.NOT_FOUND),
    });
  }

  return NextResponse.json({ job: summary });
}
