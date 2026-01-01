"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { importFromUrl } from "@/app/actions/documents/import-from-url";
import { ingestDocument } from "@/lib/documents/ingest-document";
import { checkDocumentContent } from "@/lib/middleware/moderation";
import {
  getTeamPlanDetails,
  isTeamEvaluationExpired,
  QuotaExceededError,
} from "@/lib/teams/usage";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";

interface ImportJobRow {
  id: string;
  team_id: string;
  user_id: string | null;
  base_url: string;
  status: string;
  total_count: number;
  processed_count: number;
  success_count: number;
  failure_count: number;
  is_global: boolean;
  linked_bot_ids: string[] | null;
  tags: string[] | null;
}

interface ImportItemRow {
  id: string;
  url: string;
  attempts: number;
}

export interface ImportJobSummary {
  id: string;
  status: string;
  totalCount: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
}

async function fetchJob(jobId: string): Promise<ImportJobRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bot_document_import_jobs")
    .select(
      "id, team_id, user_id, base_url, status, total_count, processed_count, success_count, failure_count, is_global, linked_bot_ids, tags"
    )
    .eq("id", jobId)
    .maybeSingle();

  return (data as ImportJobRow | null) ?? null;
}

async function fetchPendingItem(
  jobId: string
): Promise<ImportItemRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bot_document_import_items")
    .select("id, url, attempts")
    .eq("job_id", jobId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as ImportItemRow | null) ?? null;
}

async function lockItem(itemId: string, attempts: number, workerId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bot_document_import_items")
    .update({
      status: "processing",
      locked_at: new Date().toISOString(),
      locked_by: workerId,
      attempts: attempts + 1,
      error: null,
    })
    .eq("id", itemId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  return !!data;
}

async function updateJobCounts(
  job: ImportJobRow,
  success: boolean
): Promise<ImportJobSummary> {
  const supabase = createAdminClient();
  const processedCount = job.processed_count + 1;
  const successCount = job.success_count + (success ? 1 : 0);
  const failureCount = job.failure_count + (success ? 0 : 1);
  const status =
    processedCount >= job.total_count ? "completed" : "processing";

  const { data } = await supabase
    .from("bot_document_import_jobs")
    .update({
      processed_count: processedCount,
      success_count: successCount,
      failure_count: failureCount,
      status,
    })
    .eq("id", job.id)
    .select(
      "id, status, total_count, processed_count, success_count, failure_count"
    )
    .maybeSingle();

  const row = data as ImportJobRow | null;
  return {
    id: job.id,
    status: row?.status ?? status,
    totalCount: row?.total_count ?? job.total_count,
    processedCount: row?.processed_count ?? processedCount,
    successCount: row?.success_count ?? successCount,
    failureCount: row?.failure_count ?? failureCount,
  };
}

async function markItemFailed(itemId: string, message: string) {
  const supabase = createAdminClient();
  await supabase
    .from("bot_document_import_items")
    .update({
      status: "failed",
      locked_at: null,
      locked_by: null,
      error: message.slice(0, 1000),
    })
    .eq("id", itemId);
}

async function markItemCompleted(
  itemId: string,
  documentId: string,
  title: string | undefined
) {
  const supabase = createAdminClient();
  await supabase
    .from("bot_document_import_items")
    .update({
      status: "completed",
      locked_at: null,
      locked_by: null,
      error: null,
      document_id: documentId,
      title,
    })
    .eq("id", itemId);
}

export async function processDocumentImportJob({
  jobId,
  batchSize = 5,
  workerId = "document-import-worker",
}: {
  jobId: string;
  batchSize?: number;
  workerId?: string;
}): Promise<ImportJobSummary | null> {
  const job = await fetchJob(jobId);
  if (!job) return null;

  const supabase = createAdminClient();
  let latestSummary: ImportJobSummary = {
    id: job.id,
    status: job.status,
    totalCount: job.total_count,
    processedCount: job.processed_count,
    successCount: job.success_count,
    failureCount: job.failure_count,
  };

  if (job.status === "completed" || job.status === "failed") {
    return latestSummary;
  }

  const planDetails = await getTeamPlanDetails(job.team_id);
  if (isTeamEvaluationExpired(planDetails)) {
    await supabase
      .from("bot_document_import_jobs")
      .update({ status: "failed" })
      .eq("id", job.id);
    return {
      ...latestSummary,
      status: "failed",
    };
  }

  const plan = planDetails.plan;

  for (let i = 0; i < batchSize; i += 1) {
    const item = await fetchPendingItem(jobId);
    if (!item) break;

    const locked = await lockItem(item.id, item.attempts, workerId);
    if (!locked) continue;

    const importResult = await importFromUrl(item.url);
    if (!importResult.success || !importResult.content) {
      await markItemFailed(
        item.id,
        importResult.error || "Failed to import content"
      );
      latestSummary = await updateJobCounts(job, false);
      job.processed_count = latestSummary.processedCount;
      job.success_count = latestSummary.successCount;
      job.failure_count = latestSummary.failureCount;
      job.status = latestSummary.status;
      continue;
    }

    try {
      const { data: existingDoc, error: existingError } = await supabase
        .from("bot_documents")
        .select("id")
        .eq("team_id", job.team_id)
        .eq("canonical_url", item.url)
        .maybeSingle();

      if (existingError) {
        throw new Error(existingError.message);
      }

      if (existingDoc?.id) {
        await markItemFailed(item.id, "Duplicate URL already imported");
        latestSummary = await updateJobCounts(job, false);
        job.processed_count = latestSummary.processedCount;
        job.success_count = latestSummary.successCount;
        job.failure_count = latestSummary.failureCount;
        job.status = latestSummary.status;
        continue;
      }

      const isFlagged = await checkDocumentContent(importResult.content, {
        userId: job.user_id ?? undefined,
        teamId: job.team_id,
      });

      const title =
        importResult.title ??
        item.url.replace(/^https?:\/\//, "").slice(0, 200);

      const { data: created, error: insertError } = await supabase
        .from("bot_documents")
        .insert({
          title,
          content: importResult.content,
          tags: job.tags ?? ["imported"],
          is_global: job.is_global,
          canonical_url: item.url,
          user_id: job.user_id,
          team_id: job.team_id,
          is_flagged: isFlagged,
        })
        .select("id")
        .single();

      if (insertError || !created) {
        throw new Error(insertError?.message ?? "Failed to create document");
      }

      if (job.linked_bot_ids && job.linked_bot_ids.length > 0) {
        const linkRows = job.linked_bot_ids.map((botId) => ({
          bot_id: botId,
          document_id: created.id,
        }));
        const { error: linkError } = await supabase
          .from("bot_document_links")
          .insert(linkRows);
        if (linkError) {
          console.error(
            "[documents:import] Failed to link bots",
            linkError
          );
        }
      }

      await ingestDocument({
        supabase,
        documentId: created.id,
        teamId: job.team_id,
        content: importResult.content,
        plan,
      });

      await logAuditEvent({
        teamId: job.team_id,
        userId: job.user_id ?? undefined,
        action: AUDIT_ACTION.CREATE,
        resourceType: AUDIT_RESOURCE.DOCUMENT,
        resourceId: created.id,
        metadata: {
          source: "url_crawl",
          base_url: job.base_url,
          canonical_url: item.url,
        },
      });

      await markItemCompleted(item.id, created.id, title);
      latestSummary = await updateJobCounts(job, true);
    } catch (error) {
      const message =
        error instanceof QuotaExceededError
          ? "Embedding quota reached"
          : error instanceof Error
            ? error.message
            : "Failed to import document";
      await markItemFailed(item.id, message);
      latestSummary = await updateJobCounts(job, false);
    }

    job.processed_count = latestSummary.processedCount;
    job.success_count = latestSummary.successCount;
    job.failure_count = latestSummary.failureCount;
    job.status = latestSummary.status;
  }

  return latestSummary;
}
