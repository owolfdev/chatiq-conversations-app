// src/app/api/documents/create/route.ts

import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";
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
import { checkDocumentContent } from "@/lib/middleware/moderation";
import { normalizeLanguageTag } from "@/lib/language/detect-language";

interface CreateDocumentPayload {
  title: string;
  content: string;
  tags?: string[];
  isGlobal?: boolean;
  canonicalUrl?: string;
  linkedBots?: string[];
  languageOverride?: string;
  translationGroupId?: string;
}

function isValidCreatePayload(payload: unknown): payload is CreateDocumentPayload {
  if (!payload || typeof payload !== "object") return false;
  const body = payload as Record<string, unknown>;
  if (typeof body.title !== "string" || body.title.trim().length === 0) return false;
  if (typeof body.content !== "string") return false;
  if (body.tags && !Array.isArray(body.tags)) return false;
  if (body.isGlobal !== undefined && typeof body.isGlobal !== "boolean") return false;
  if (body.canonicalUrl && typeof body.canonicalUrl !== "string") return false;
  if (body.linkedBots && !Array.isArray(body.linkedBots)) return false;
  if (body.languageOverride && typeof body.languageOverride !== "string")
    return false;
  if (body.translationGroupId && typeof body.translationGroupId !== "string")
    return false;
  return true;
}

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
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const response = createErrorResponse(
      ErrorCode.UNAUTHORIZED,
      "You must be signed in to create a document."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.UNAUTHORIZED),
    });
  }

  let payload: CreateDocumentPayload | null = null;
  try {
    const raw = await request.json();
    if (!isValidCreatePayload(raw)) {
      throw new Error("Invalid document payload");
    }
    payload = raw;
  } catch (error) {
    console.error("[documents:create] Invalid request payload", error);
    const response = createErrorResponse(
      ErrorCode.INVALID_INPUT,
      "Invalid document payload"
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
      "Evaluation period ended. Upgrade to add documents."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.EVALUATION_EXPIRED),
    });
  }

  const plan = planDetails.plan;

  try {
    await ensureQuotaAllows(teamId, plan, "documents", 1);
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

  // Check document content for moderation flags
  // We allow flagged documents to be created but mark them as flagged
  const isFlagged = await checkDocumentContent(
    payload.content,
    {
      userId: user.id,
      teamId,
      botId: undefined, // Documents aren't tied to a specific bot initially
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    }
  );

  const languageOverride = payload.languageOverride?.trim();
  const normalizedOverride = languageOverride
    ? normalizeLanguageTag(languageOverride)
    : null;

  const { data: created, error: insertError } = await supabase
    .from("bot_documents")
    .insert({
      title: payload.title,
      content: payload.content,
      tags: payload.tags ?? [],
      is_global: payload.isGlobal ?? false,
      canonical_url: payload.canonicalUrl ?? null,
      user_id: user.id,
      team_id: teamId,
      is_flagged: isFlagged,
      language_override: normalizedOverride,
      translation_group_id: payload.translationGroupId ?? null,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("[documents:create] Failed to insert document", insertError);
    const response = createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      "Failed to create document"
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.DATABASE_ERROR),
    });
  }

  if (payload.linkedBots && payload.linkedBots.length > 0) {
    const linkRows = payload.linkedBots.map((botId) => ({
      document_id: created.id,
      bot_id: botId,
    }));

    const { error: linkError } = await supabase
      .from("bot_document_links")
      .insert(linkRows);

    if (linkError) {
      console.error("[documents:create] Failed to link bots", linkError);
    }
  }

  await logAuditEvent({
    teamId,
    userId: user.id,
    action: AUDIT_ACTION.CREATE,
    resourceType: AUDIT_RESOURCE.DOCUMENT,
    resourceId: created.id,
    metadata: {
      title: payload.title,
      tags: payload.tags ?? [],
      is_global: payload.isGlobal ?? false,
      canonical_url: payload.canonicalUrl ?? null,
      linked_bots: payload.linkedBots ?? [],
      is_flagged: isFlagged,
    },
    ipAddress,
    userAgent,
  });

  return NextResponse.json(
    { id: created.id, is_flagged: isFlagged },
    { status: 201 }
  );
}
