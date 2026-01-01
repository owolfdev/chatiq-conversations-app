// src/app/actions/bots/delete-bot.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { logUserActivity } from "@/app/actions/activity/log-user-activity";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";

interface DeleteBotOptions {
  deleteLinkedDocuments?: boolean;
}

export async function deleteBot(id: string, options: DeleteBotOptions = {}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  // Get user's team_id for RLS validation
  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    return {
      success: false,
      error: "No team found. Please contact support or wait for team creation to complete.",
    };
  }

  // Verify bot exists and get its details for logging
  const { data: existingBot, error: fetchError } = await supabase
    .from("bot_bots")
    .select("id, name, slug, team_id")
    .eq("id", id)
    .single();

  if (fetchError || !existingBot) {
    return {
      success: false,
      error: "Bot not found or you don't have permission to delete it.",
    };
  }

  // Verify team ownership (additional security check)
  if (existingBot.team_id !== teamId) {
    return {
      success: false,
      error: "You don't have permission to delete this bot.",
    };
  }

  let deletedDocuments = 0;
  let keptSharedDocuments = 0;

  if (options.deleteLinkedDocuments) {
    const { data: directDocs } = await supabase
      .from("bot_documents")
      .select("id, bot_id")
      .eq("bot_id", id);

    const { data: linkedDocs } = await supabase
      .from("bot_document_links")
      .select("document_id")
      .eq("bot_id", id);

    const allDocIds = Array.from(
      new Set([
        ...(directDocs?.map((doc) => doc.id) ?? []),
        ...(linkedDocs?.map((link) => link.document_id) ?? []),
      ])
    );

    if (allDocIds.length > 0) {
      const { data: linkCounts } = await supabase
        .from("bot_document_links")
        .select("document_id, bot_id")
        .in("document_id", allDocIds);

      const deletableDocs: string[] = [];

      allDocIds.forEach((docId) => {
        const otherLinks =
          linkCounts?.filter(
            (link) => link.document_id === docId && link.bot_id !== id
          ) ?? [];
        if (otherLinks.length === 0) {
          deletableDocs.push(docId);
        } else {
          keptSharedDocuments += 1;
        }
      });

      if (deletableDocs.length > 0) {
        const { error: deleteDocsError, count } = await supabase
          .from("bot_documents")
          .delete({ count: "exact" })
          .in("id", deletableDocs);

        if (deleteDocsError) {
          return {
            success: false,
            error: deleteDocsError.message,
          };
        }
        deletedDocuments = count ?? deletableDocs.length;
      }
    }
  }

  // Delete the bot
  const { error: deleteError } = await supabase
    .from("bot_bots")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  await logAuditEvent({
    teamId,
    userId: user.id,
    action: AUDIT_ACTION.DELETE,
    resourceType: AUDIT_RESOURCE.BOT,
    resourceId: id,
    metadata: {
      name: existingBot.name,
      slug: existingBot.slug,
    },
  });

  // Log activity
  await logUserActivity({
    userId: user.id,
    type: "bot_deleted",
    message: `Deleted bot ${existingBot.name}`,
    metadata: { bot_id: id, bot_slug: existingBot.slug },
  });

  return {
    success: true,
    deletedDocuments,
    keptSharedDocuments,
  };
}
