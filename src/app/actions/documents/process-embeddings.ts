"use server";

import { createClient } from "@/utils/supabase/server";
import { processEmbeddingJobs } from "@/lib/documents/process-embedding-jobs";

/**
 * Server action to process pending embedding jobs.
 * This can be called from client components after document ingestion.
 * 
 * @param batchSize - Number of jobs to process (default: 10)
 * @returns Result with number of processed jobs
 */
export async function processEmbeddings(batchSize: number = 10) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Unauthorized",
      processed: 0,
    };
  }

  try {
    const result = await processEmbeddingJobs({
      batchSize: Math.min(batchSize, 20), // Cap at 20 for safety
      workerId: "server-action",
    });

    return {
      success: true,
      processed: result.processed,
    };
  } catch (error) {
    console.error("Failed to process embeddings", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      processed: 0,
    };
  }
}

