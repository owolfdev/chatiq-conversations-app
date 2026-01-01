"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { env } from "@/lib/env";
import {
  getCachedEmbedding,
  storeCachedEmbedding,
  EMBEDDING_MODEL_VERSION,
} from "./embedding-cache";

export interface ProcessJobsOptions {
  batchSize?: number;
  workerId?: string;
}

interface JobRecord {
  id: string;
  chunk_id: string;
  team_id: string;
  status: string;
  attempts: number;
}

const EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_ATTEMPTS = 5;

async function fetchPendingJob(
  supabase: ReturnType<typeof createAdminClient>
): Promise<JobRecord | null> {
  const { data, error } = await supabase
    .from("bot_embedding_jobs")
    .select("id, chunk_id, team_id, status, attempts")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

async function lockJob(
  supabase: ReturnType<typeof createAdminClient>,
  job: JobRecord,
  workerId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("bot_embedding_jobs")
    .update({
      status: "processing",
      locked_at: new Date().toISOString(),
      locked_by: workerId,
      attempts: job.attempts + 1,
      error: null,
    })
    .eq("id", job.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to lock embedding job", error);
  }

  return !!data;
}

async function markJobCompleted(
  supabase: ReturnType<typeof createAdminClient>,
  jobId: string
): Promise<void> {
  const { error } = await supabase
    .from("bot_embedding_jobs")
    .update({
      status: "completed",
      locked_at: null,
      locked_by: null,
      error: null,
    })
    .eq("id", jobId);

  if (error) {
    console.error("Failed to mark job completed", error);
  }
}

async function markJobFailed(
  supabase: ReturnType<typeof createAdminClient>,
  job: JobRecord,
  message: string
): Promise<void> {
  const status =
    job.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending";

  const { error } = await supabase
    .from("bot_embedding_jobs")
    .update({
      status,
      locked_at: null,
      locked_by: null,
      error: message.slice(0, 1000),
    })
    .eq("id", job.id);

  if (error) {
    console.error("Failed to mark job failed", error);
  }
}

export async function processEmbeddingJobs({
  batchSize = 5,
  workerId = "embedding-worker",
}: ProcessJobsOptions = {}) {
  const supabase = createAdminClient();
  let processed = 0;

  while (processed < batchSize) {
    const job = await fetchPendingJob(supabase);
    if (!job) {
      break;
    }

    const locked = await lockJob(supabase, job, workerId);
    if (!locked) {
      continue;
    }

    const { data: chunk, error: chunkError } = await supabase
      .from("bot_doc_chunks")
      .select("text, document_id, idx, anchor_id, hash")
      .eq("id", job.chunk_id)
      .maybeSingle();

    if (chunkError || !chunk?.text || !chunk?.hash) {
      await markJobFailed(
        supabase,
        job,
        chunkError?.message ?? "Chunk not found or empty"
      );
      continue;
    }

    try {
      let embedding: number[];
      let fromCache = false;

      // Step 1: Check cache first (team-scoped, model-versioned)
      const cached = await getCachedEmbedding(
        supabase,
        chunk.hash,
        job.team_id
      );

      if (cached) {
        embedding = cached.vector;
        fromCache = true;
        console.log(
          `Cache hit for chunk ${job.chunk_id} (hash: ${chunk.hash.substring(0, 8)}...)`
        );
      } else {
        // Step 2: Cache miss - call OpenAI API
        console.log(
          `Cache miss for chunk ${job.chunk_id} (hash: ${chunk.hash.substring(0, 8)}...), calling OpenAI`
        );
        embedding = await fetchEmbedding(chunk.text);

        // Step 3: Store in cache for future use (fire and forget)
        storeCachedEmbedding(supabase, chunk.hash, job.team_id, embedding).catch(
          (err) => {
            console.error("Failed to cache embedding (non-fatal)", err);
          }
        );
      }

      // Step 4: Store embedding in bot_embeddings (required for retrieval)
      const { error: upsertError } = await supabase
        .from("bot_embeddings")
        .upsert({
          chunk_id: job.chunk_id,
          team_id: job.team_id,
          collection_id: null,
          vector: embedding,
        });

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      await markJobCompleted(supabase, job.id);
      processed += 1;

      // Log cache statistics for monitoring
      if (fromCache) {
        console.log(`✅ Processed job ${job.id} using cached embedding`);
      } else {
        console.log(`✅ Processed job ${job.id} with new embedding`);
      }
    } catch (error) {
      console.error("Embedding job failed", error);
      const message =
        error instanceof Error ? error.message : "Unknown embedding error";
      await markJobFailed(supabase, job, message);
    }
  }

  return { processed };
}

async function fetchEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message =
      payload?.error?.message ?? `${response.status} ${response.statusText}`;
    throw new Error(`OpenAI embedding request failed: ${message}`);
  }

  const json = (await response.json()) as {
    data?: Array<{ embedding: number[] }>;
  };

  const embedding = json.data?.[0]?.embedding;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Invalid embedding response");
  }

  return embedding;
}


