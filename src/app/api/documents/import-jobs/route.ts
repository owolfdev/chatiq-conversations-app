import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import {
  ensureQuotaAllows,
  getTeamPlanDetails,
  isTeamEvaluationExpired,
  QuotaExceededError,
} from "@/lib/teams/usage";
import {
  createErrorResponse,
  ErrorCode,
  getErrorStatus,
} from "@/lib/utils/error-responses";

interface ImportJobPayload {
  baseUrl: string;
  urls: string[];
  isGlobal?: boolean;
  linkedBotIds?: string[];
  tags?: string[];
}

const MAX_IMPORT_URLS = 200;

function isValidPayload(payload: unknown): payload is ImportJobPayload {
  if (!payload || typeof payload !== "object") return false;
  const body = payload as Record<string, unknown>;
  if (typeof body.baseUrl !== "string" || body.baseUrl.trim().length === 0) {
    return false;
  }
  if (!Array.isArray(body.urls) || body.urls.length === 0) return false;
  if (body.isGlobal !== undefined && typeof body.isGlobal !== "boolean") {
    return false;
  }
  if (body.linkedBotIds && !Array.isArray(body.linkedBotIds)) return false;
  if (body.tags && !Array.isArray(body.tags)) return false;
  return true;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
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
      "You must be signed in to import URLs."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.UNAUTHORIZED),
    });
  }

  let payload: ImportJobPayload | null = null;
  try {
    const raw = await request.json();
    if (!isValidPayload(raw)) {
      throw new Error("Invalid import payload");
    }
    payload = raw;
  } catch (error) {
    console.error("[documents:import-jobs] Invalid request payload", error);
    const response = createErrorResponse(
      ErrorCode.INVALID_INPUT,
      "Invalid import payload"
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.INVALID_INPUT),
    });
  }

  if (payload.urls.length > MAX_IMPORT_URLS) {
    const response = createErrorResponse(
      ErrorCode.INVALID_INPUT,
      `Too many URLs selected. Max ${MAX_IMPORT_URLS}.`
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.INVALID_INPUT),
    });
  }

  const invalidUrl = payload.urls.find((url) => !isValidHttpUrl(url));
  if (invalidUrl) {
    const response = createErrorResponse(
      ErrorCode.INVALID_INPUT,
      `Invalid URL detected: ${invalidUrl}`
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.INVALID_INPUT),
    });
  }

  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    const response = createErrorResponse(
      ErrorCode.FORBIDDEN,
      "No team found for the current user."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.FORBIDDEN),
    });
  }

  const planDetails = await getTeamPlanDetails(teamId);
  if (isTeamEvaluationExpired(planDetails)) {
    const response = createErrorResponse(
      ErrorCode.EVALUATION_EXPIRED,
      "Evaluation period ended. Upgrade to import documents."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.EVALUATION_EXPIRED),
    });
  }

  const plan = planDetails.plan;
  if (plan === "free") {
    const response = createErrorResponse(
      ErrorCode.FORBIDDEN,
      "Upgrade to Pro to import full documentation sites."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.FORBIDDEN),
    });
  }

  try {
    await ensureQuotaAllows(teamId, plan, "documents", payload.urls.length);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      const response = createErrorResponse(
        ErrorCode.QUOTA_EXCEEDED,
      "Document quota reached. Upgrade your plan to add more documents.",
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
    throw error;
  }

  const { data: job, error: jobError } = await supabase
    .from("bot_document_import_jobs")
    .insert({
      team_id: teamId,
      user_id: user.id,
      base_url: payload.baseUrl,
      total_count: payload.urls.length,
      is_global: payload.isGlobal ?? false,
      linked_bot_ids: payload.linkedBotIds ?? null,
      tags: payload.tags ?? ["imported"],
      status: "pending",
    })
    .select("id")
    .single();

  if (jobError || !job) {
    console.error("[documents:import-jobs] Failed to create job", jobError);
    const response = createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      "Failed to create import job"
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.DATABASE_ERROR),
    });
  }

  const itemRows = payload.urls.map((url) => ({
    job_id: job.id,
    team_id: teamId,
    url,
  }));

  const { error: itemsError } = await supabase
    .from("bot_document_import_items")
    .insert(itemRows);

  if (itemsError) {
    console.error("[documents:import-jobs] Failed to create items", itemsError);
    const response = createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      "Failed to queue import items"
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.DATABASE_ERROR),
    });
  }

  return NextResponse.json({ id: job.id }, { status: 201 });
}
