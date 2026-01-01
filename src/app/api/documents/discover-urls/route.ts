import { NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import {
  getTeamPlanDetails,
  isTeamEvaluationExpired,
} from "@/lib/teams/usage";
import { discoverUrls } from "@/lib/documents/url-crawler";
import {
  createErrorResponse,
  ErrorCode,
  getErrorStatus,
} from "@/lib/utils/error-responses";

interface DiscoverPayload {
  baseUrl: string;
  maxDepth?: number;
  allowPathPrefix?: string;
  useSitemap?: boolean;
}

function isValidPayload(payload: unknown): payload is DiscoverPayload {
  if (!payload || typeof payload !== "object") return false;
  const body = payload as Record<string, unknown>;
  if (typeof body.baseUrl !== "string" || body.baseUrl.trim().length === 0) {
    return false;
  }
  if (body.maxDepth !== undefined && typeof body.maxDepth !== "number") {
    return false;
  }
  if (
    body.allowPathPrefix !== undefined &&
    typeof body.allowPathPrefix !== "string"
  ) {
    return false;
  }
  if (body.useSitemap !== undefined && typeof body.useSitemap !== "boolean") {
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
      "You must be signed in to discover URLs."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.UNAUTHORIZED),
    });
  }

  let payload: DiscoverPayload | null = null;
  try {
    const raw = await request.json();
    if (!isValidPayload(raw)) {
      throw new Error("Invalid discover payload");
    }
    payload = raw;
  } catch (error) {
    console.error("[documents:discover-urls] Invalid request payload", error);
    const response = createErrorResponse(
      ErrorCode.INVALID_INPUT,
      "Invalid discover payload"
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
      "Evaluation period ended. Upgrade to crawl documentation sites."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.EVALUATION_EXPIRED),
    });
  }

  const plan = planDetails.plan;
  if (plan === "free") {
    const response = createErrorResponse(
      ErrorCode.FORBIDDEN,
      "Upgrade to Pro to crawl full documentation sites."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.FORBIDDEN),
    });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(payload.baseUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Only HTTP/HTTPS URLs are supported.");
    }
  } catch {
    const response = createErrorResponse(
      ErrorCode.INVALID_INPUT,
      "Invalid base URL. Include the protocol (https://)."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.INVALID_INPUT),
    });
  }

  try {
    const result = await discoverUrls({
      baseUrl: payload.baseUrl,
      maxDepth: payload.maxDepth,
      allowPathPrefix: payload.allowPathPrefix,
      useSitemap: payload.useSitemap,
    });

    return NextResponse.json({
      root: result.root,
      total: result.total,
      errors: result.errors,
    });
  } catch (error) {
    console.error("[documents:discover-urls] Failed to crawl", error);
    const response = createErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      error instanceof Error ? error.message : "Failed to crawl URLs"
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.INTERNAL_SERVER_ERROR),
    });
  }
}
