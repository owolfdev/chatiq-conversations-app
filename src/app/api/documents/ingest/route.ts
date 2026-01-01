"use server";

import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { ingestDocument } from "@/lib/documents/ingest-document";
import {
  getTeamPlanDetails,
  isTeamEvaluationExpired,
  QuotaExceededError,
} from "@/lib/teams/usage";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";
import {
  createErrorResponse,
  ErrorCode,
  getErrorStatus,
} from "@/lib/utils/error-responses";

export async function POST(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const ipAddress =
    forwardedFor.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent") || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
      }
    );
  }

  const body = await request.json().catch(() => null);
  const documentId = body?.documentId as string | undefined;

  if (!documentId) {
    return NextResponse.json(
      { error: "documentId is required" },
      { status: 400 }
    );
  }

  const { data: document, error: docError } = await supabase
    .from("bot_documents")
    .select("id, team_id, content")
    .eq("id", documentId)
    .single();

  if (docError || !document) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  try {
    const planDetails = await getTeamPlanDetails(document.team_id);
    if (isTeamEvaluationExpired(planDetails)) {
      const response = createErrorResponse(
        ErrorCode.EVALUATION_EXPIRED,
        "Evaluation period ended. Upgrade to process documents."
      );
      return NextResponse.json(response, {
        status: getErrorStatus(ErrorCode.EVALUATION_EXPIRED),
      });
    }
    const plan = planDetails.plan;
    const result = await ingestDocument({
      supabase,
      documentId: document.id,
      teamId: document.team_id,
      content: document.content ?? "",
      plan,
    });

    await logAuditEvent({
      teamId: document.team_id,
      userId: user.id,
      action: AUDIT_ACTION.UPDATE,
      resourceType: AUDIT_RESOURCE.DOCUMENT,
      resourceId: document.id,
      metadata: {
        operation: "ingest",
        chunk_count: result.chunkCount,
        job_count: result.jobCount,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      const response = createErrorResponse(
        ErrorCode.QUOTA_EXCEEDED,
        "Embedding quota reached. Upgrade your plan to process more content.",
        {
          resource: error.resource,
          limit: error.limit,
          used: error.used,
        }
      );
      return NextResponse.json(response, {
        status: getErrorStatus(ErrorCode.QUOTA_EXCEEDED),
      });
    }
    console.error("Failed to ingest document", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to ingest document",
      },
      { status: 500 }
    );
  }
}

