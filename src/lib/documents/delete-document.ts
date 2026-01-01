"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { AUDIT_RESOURCE } from "@/lib/audit/constants";
import { DocumentNotFoundError } from "@/lib/documents/errors";

interface DeleteDocumentOptions {
  documentId: string;
  teamId: string;
}

export async function deleteDocumentHard({
  documentId,
  teamId,
}: DeleteDocumentOptions): Promise<void> {
  const admin = createAdminClient();

  const { data: document, error: fetchError } = await admin
    .from("bot_documents")
    .select(
      "id, title, team_id, canonical_url, tags, is_global, created_at, bot_document_links(bot_id)"
    )
    .eq("id", documentId)
    .eq("team_id", teamId)
    .single();

  if (fetchError || !document) {
    throw new DocumentNotFoundError();
  }

  const { data: chunkRows, error: chunkFetchError } = await admin
    .from("bot_doc_chunks")
    .select("id")
    .eq("document_id", documentId);

  if (chunkFetchError) {
    throw new Error(
      `Failed to fetch document chunks before deletion: ${chunkFetchError.message}`
    );
  }

  const chunkIds = new Set(
    (chunkRows ?? []).map((row) => row.id).filter(Boolean) as string[]
  );

  if (chunkIds.size > 0) {
    const { data: conversations, error: convoFetchError } = await admin
      .from("bot_conversations")
      .select("id, context_chunk_ids")
      .eq("team_id", teamId);

    if (convoFetchError) {
      throw new Error(
        `Failed to fetch conversations for chunk cleanup: ${convoFetchError.message}`
      );
    }

    const updates = (conversations ?? []).flatMap((conversation) => {
      const current = Array.isArray(conversation.context_chunk_ids)
        ? conversation.context_chunk_ids
        : [];

      const filtered = current.filter(
        (value) => typeof value === "string" && !chunkIds.has(value)
      );

      if (filtered.length === current.length) {
        return [];
      }

      return admin
        .from("bot_conversations")
        .update({ context_chunk_ids: filtered })
        .eq("id", conversation.id)
        .select("id");
    });

    if (updates.length > 0) {
      const results = await Promise.allSettled(updates);
      const rejected = results.find(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected"
      );
      if (rejected) {
        throw new Error(
          `Failed to update pinned conversation context: ${rejected.reason}`
        );
      }
    }
  }

  const { error: auditDeleteError } = await admin
    .from("bot_audit_log")
    .delete()
    .eq("resource_type", AUDIT_RESOURCE.DOCUMENT)
    .eq("resource_id", documentId);

  if (auditDeleteError) {
    throw new Error(
      `Failed to purge audit log entries: ${auditDeleteError.message}`
    );
  }

  const { error: deleteError } = await admin
    .from("bot_documents")
    .delete()
    .eq("id", documentId)
    .eq("team_id", teamId);

  if (deleteError) {
    throw new Error(`Failed to delete document: ${deleteError.message}`);
  }

  // No audit event recorded to honor hard-delete semantics.
}

