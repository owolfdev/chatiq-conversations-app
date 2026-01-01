// src/app/api/documents/update/route.ts

import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";
import {
  createErrorResponse,
  ErrorCode,
  getErrorStatus,
} from "@/lib/utils/error-responses";
import { checkDocumentContent } from "@/lib/middleware/moderation";
import { clearBotCache } from "@/lib/chat/cache-cleanup";
import {
  getTeamPlanDetails,
  isTeamEvaluationExpired,
} from "@/lib/teams/usage";
import { normalizeLanguageTag } from "@/lib/language/detect-language";

interface UpdateDocumentPayload {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  isGlobal?: boolean;
  canonicalUrl?: string;
  linkedBots?: string[];
  languageOverride?: string | null;
  translationGroupId?: string | null;
}

function isValidUpdatePayload(payload: unknown): payload is UpdateDocumentPayload {
  if (!payload || typeof payload !== "object") return false;
  const body = payload as Record<string, unknown>;
  if (typeof body.id !== "string" || body.id.trim().length === 0) return false;
  if (body.title !== undefined && typeof body.title !== "string") return false;
  if (body.content !== undefined && typeof body.content !== "string") return false;
  if (body.tags !== undefined && !Array.isArray(body.tags)) return false;
  if (body.isGlobal !== undefined && typeof body.isGlobal !== "boolean") return false;
  if (body.canonicalUrl !== undefined && body.canonicalUrl !== null && typeof body.canonicalUrl !== "string") return false;
  if (body.linkedBots !== undefined && !Array.isArray(body.linkedBots)) return false;
  if (
    body.languageOverride !== undefined &&
    body.languageOverride !== null &&
    typeof body.languageOverride !== "string"
  )
    return false;
  if (
    body.translationGroupId !== undefined &&
    body.translationGroupId !== null &&
    typeof body.translationGroupId !== "string"
  )
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
      "You must be signed in to update a document."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.UNAUTHORIZED),
    });
  }

  let payload: UpdateDocumentPayload | null = null;
  try {
    const raw = await request.json();
    if (!isValidUpdatePayload(raw)) {
      throw new Error("Invalid document update payload");
    }
    payload = raw;
  } catch (error) {
    console.error("[documents:update] Invalid request payload", error);
    const response = createErrorResponse(
      ErrorCode.INVALID_INPUT,
      "Invalid document update payload"
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
      "Evaluation period ended. Upgrade to update documents."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.EVALUATION_EXPIRED),
    });
  }

  // Check if document exists and belongs to user's team
  const { data: existing, error: fetchError } = await supabase
    .from("bot_documents")
    .select("id, team_id, user_id")
    .eq("id", payload.id)
    .single();

  if (fetchError || !existing) {
    const response = createErrorResponse(
      ErrorCode.NOT_FOUND,
      "Document not found"
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.NOT_FOUND),
    });
  }

  // Verify ownership (must be team document or user's personal document)
  if (existing.team_id !== teamId && existing.user_id !== user.id) {
    const response = createErrorResponse(
      ErrorCode.FORBIDDEN,
      "You don't have permission to update this document."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.FORBIDDEN),
    });
  }

  // Check document content for moderation flags if content is being updated
  let isFlagged: boolean | undefined = undefined;
  if (payload.content !== undefined) {
    isFlagged = await checkDocumentContent(payload.content, {
      userId: user.id,
      teamId: existing.team_id || teamId,
      botId: undefined,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    });
  }

  // Build update data
  const updateData: {
    title?: string;
    content?: string;
    tags?: string[];
    is_global?: boolean;
    canonical_url?: string | null;
    is_flagged?: boolean;
    language_override?: string | null;
    translation_group_id?: string | null;
  } = {};

  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.content !== undefined) updateData.content = payload.content;
  if (payload.tags !== undefined) updateData.tags = payload.tags;
  if (payload.isGlobal !== undefined) updateData.is_global = payload.isGlobal;
  if (payload.canonicalUrl !== undefined) {
    updateData.canonical_url = payload.canonicalUrl || null;
  }
  if (payload.languageOverride !== undefined) {
    const override = payload.languageOverride?.trim();
    updateData.language_override = override
      ? normalizeLanguageTag(override)
      : null;
  }
  if (payload.translationGroupId !== undefined) {
    updateData.translation_group_id = payload.translationGroupId || null;
  }
  // Update is_flagged if content was checked
  if (isFlagged !== undefined) {
    updateData.is_flagged = isFlagged;
  }

  const { data: updated, error: updateError } = await supabase
    .from("bot_documents")
    .update(updateData)
    .eq("id", payload.id)
    .select("id")
    .single();

  if (updateError || !updated) {
    console.error("[documents:update] Failed to update document", updateError);
    const response = createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      "Failed to update document"
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.DATABASE_ERROR),
    });
  }

  // Update document-bot links if provided
  if (payload.linkedBots !== undefined) {
    // Delete existing links
    await supabase
      .from("bot_document_links")
      .delete()
      .eq("document_id", payload.id);

    // Insert new links
    if (payload.linkedBots.length > 0) {
      const linkRows = payload.linkedBots.map((botId) => ({
        document_id: payload.id,
        bot_id: botId,
      }));

      const { error: linkError } = await supabase
        .from("bot_document_links")
        .insert(linkRows);

      if (linkError) {
        console.error("[documents:update] Failed to update bot links", linkError);
      }
    }
  }

  // Determine which bots need cache cleared (linked bots or existing links)
  let botIdsToClear: string[] = [];
  if (payload.linkedBots !== undefined) {
    botIdsToClear = payload.linkedBots;
  } else {
    const { data: linkedBots } = await supabase
      .from("bot_document_links")
      .select("bot_id")
      .eq("document_id", payload.id);

    botIdsToClear = linkedBots?.map((link) => link.bot_id) ?? [];
  }

  if (botIdsToClear.length > 0) {
    const uniqueBotIds = Array.from(new Set(botIdsToClear));
    // Best-effort: clear caches so updated document content is reflected
    const cacheResults = await Promise.allSettled(
      uniqueBotIds.map((botId) => clearBotCache(botId))
    );
    cacheResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `[documents:update] Failed to clear cache for bot ${uniqueBotIds[index]}`,
          result.reason
        );
      }
    });
  }

  await logAuditEvent({
    teamId: existing.team_id || teamId,
    userId: user.id,
    action: AUDIT_ACTION.UPDATE,
    resourceType: AUDIT_RESOURCE.DOCUMENT,
    resourceId: payload.id,
    metadata: {
      title: payload.title,
      tags: payload.tags,
      is_global: payload.isGlobal,
      canonical_url: payload.canonicalUrl,
      linked_bots: payload.linkedBots,
      is_flagged: isFlagged,
      content_updated: payload.content !== undefined,
    },
    ipAddress,
    userAgent,
  });

  return NextResponse.json(
    { id: updated.id, is_flagged: isFlagged },
    { status: 200 }
  );
}
