"use server";

import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { chunkDocumentContent } from "./chunk-document";
import {
  ensureQuotaAllows,
  type PlanId,
} from "@/lib/teams/usage";
import {
  detectLanguage,
  normalizeLanguageTag,
} from "@/lib/language/detect-language";

interface IngestDocumentOptions {
  supabase: SupabaseClient;
  documentId: string;
  teamId: string;
  content: string;
  plan: PlanId;
}

export interface IngestResult {
  chunkCount: number;
  jobCount: number;
}

function hashContent(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export async function ingestDocument({
  supabase,
  documentId,
  teamId,
  content,
  plan,
}: IngestDocumentOptions): Promise<IngestResult> {
  const { data: documentMeta, error: documentError } = await supabase
    .from("bot_documents")
    .select("language_override")
    .eq("id", documentId)
    .maybeSingle();

  if (documentError) {
    console.error(
      "[documents:ingest] Failed to fetch language override",
      documentError
    );
  }

  const override = documentMeta?.language_override?.trim();
  let detectedLanguage: string | null = null;
  let detectedConfidence: number | null = null;

  if (override) {
    detectedLanguage = normalizeLanguageTag(override);
    detectedConfidence = 1;
  } else {
    const detection = detectLanguage(content);
    detectedLanguage = detection.language
      ? normalizeLanguageTag(detection.language)
      : null;
    detectedConfidence = detection.confidence ?? null;
  }

  const { error: updateError } = await supabase
    .from("bot_documents")
    .update({
      language: detectedLanguage,
      language_confidence: detectedConfidence,
    })
    .eq("id", documentId);

  if (updateError) {
    console.error(
      "[documents:ingest] Failed to update document language",
      updateError
    );
  }

  const chunks = chunkDocumentContent(content);

  // Remove existing chunks (cascade clears embeddings + jobs)
  const { error: deleteError } = await supabase
    .from("bot_doc_chunks")
    .delete()
    .eq("document_id", documentId);

  if (deleteError) {
    throw new Error(
      `Failed to clear existing document chunks: ${deleteError.message}`
    );
  }

  if (chunks.length === 0) {
    // Nothing to chunk, nothing to queue
    return { chunkCount: 0, jobCount: 0 };
  }

  await ensureQuotaAllows(teamId, plan, "embeddings", chunks.length);

  const chunkRows = chunks.map(({ idx, text }) => ({
    team_id: teamId,
    document_id: documentId,
    idx,
    text,
    hash: hashContent(text),
    anchor_id: null,
    language: detectedLanguage,
    language_confidence: detectedConfidence,
    language_override: override ?? null,
  }));

  const { data: insertedChunks, error: insertError } = await supabase
    .from("bot_doc_chunks")
    .insert(chunkRows)
    .select("id");

  if (insertError || !insertedChunks) {
    throw new Error(
      `Failed to insert document chunks: ${insertError?.message ?? "unknown"}`
    );
  }

  const jobRows = insertedChunks.map((chunk) => ({
    chunk_id: chunk.id,
    team_id: teamId,
    status: "pending",
  }));

  const { error: queueError } = await supabase
    .from("bot_embedding_jobs")
    .insert(jobRows);

  if (queueError) {
    throw new Error(
      `Failed to queue embedding jobs: ${queueError.message ?? "unknown"}`
    );
  }

  return {
    chunkCount: insertedChunks.length,
    jobCount: jobRows.length,
  };
}

