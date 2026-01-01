import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import {
  createErrorResponse,
  ErrorCode,
  getErrorStatus,
} from "@/lib/utils/error-responses";
import { deleteDocumentHard } from "@/lib/documents/delete-document";
import { DocumentNotFoundError } from "@/lib/documents/errors";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
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
      "You must be signed in to delete a document."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.UNAUTHORIZED),
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

  try {
    await deleteDocumentHard({
      documentId: id,
      teamId,
    });
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      const response = createErrorResponse(
        ErrorCode.NOT_FOUND,
        "Document not found."
      );
      return NextResponse.json(response, {
        status: getErrorStatus(ErrorCode.NOT_FOUND),
      });
    }

    console.error("[documents:delete] Failed to delete document", {
      documentId: id,
      teamId,
      ipAddress,
      userAgent,
      error,
    });

    const response = createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      "Failed to delete document."
    );
    return NextResponse.json(response, {
      status: getErrorStatus(ErrorCode.DATABASE_ERROR),
    });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

