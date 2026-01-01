"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";

export interface EmbeddingQueueStats {
  pending: number;
  processing: number;
  failed: number;
  completed: number;
  processingRate: number; // jobs per hour
  stuckJobs: number; // jobs in "processing" for > 5 minutes
  status: "healthy" | "warning" | "error";
  lastUpdated: string;
}

/**
 * Get embedding queue statistics for the current user's team.
 * Returns counts of pending, processing, failed, and completed jobs,
 * plus processing rate and health status.
 */
export async function getEmbeddingQueueStats(): Promise<EmbeddingQueueStats> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      pending: 0,
      processing: 0,
      failed: 0,
      completed: 0,
      processingRate: 0,
      stuckJobs: 0,
      status: "healthy",
      lastUpdated: new Date().toISOString(),
    };
  }

  const teamId = await getUserTeamId(user.id);

  if (!teamId) {
    return {
      pending: 0,
      processing: 0,
      failed: 0,
      completed: 0,
      processingRate: 0,
      stuckJobs: 0,
      status: "healthy",
      lastUpdated: new Date().toISOString(),
    };
  }

  // Get current job counts by status
  const { data: statusCounts, error: statusError } = await supabase
    .from("bot_embedding_jobs")
    .select("status, created_at, updated_at, locked_at")
    .eq("team_id", teamId);

  if (statusError || !statusCounts) {
    console.error("Failed to fetch embedding queue stats", statusError);
    return {
      pending: 0,
      processing: 0,
      failed: 0,
      completed: 0,
      processingRate: 0,
      stuckJobs: 0,
      status: "error",
      lastUpdated: new Date().toISOString(),
    };
  }

  const pending = statusCounts.filter((j) => j.status === "pending").length;
  const processing = statusCounts.filter((j) => j.status === "processing")
    .length;
  const failed = statusCounts.filter((j) => j.status === "failed").length;
  const completed = statusCounts.filter((j) => j.status === "completed")
    .length;

  // Calculate stuck jobs (processing for > 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const stuckJobs = statusCounts.filter(
    (j) =>
      j.status === "processing" &&
      j.locked_at &&
      j.locked_at < fiveMinutesAgo
  ).length;

  // Calculate processing rate (jobs completed in last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentCompleted = statusCounts.filter(
    (j) =>
      j.status === "completed" &&
      j.updated_at &&
      j.updated_at >= oneHourAgo
  ).length;

  // Determine health status
  let status: "healthy" | "warning" | "error" = "healthy";
  if (stuckJobs > 0 || failed > 10) {
    status = "error";
  } else if (pending > 50 || failed > 0) {
    status = "warning";
  }

  return {
    pending,
    processing,
    failed,
    completed,
    processingRate: recentCompleted,
    stuckJobs,
    status,
    lastUpdated: new Date().toISOString(),
  };
}

