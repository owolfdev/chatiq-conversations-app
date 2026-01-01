// lib/chat/cache-cleanup.ts
// Utilities for cleaning up expired and stale cached responses

import { createAdminClient } from "@/utils/supabase/admin";

export interface CleanupResult {
  deleted_count: number;
  oldest_expired: string | null;
}

/**
 * Clean up expired cache entries
 * Should be called periodically (e.g., via cron job or scheduled task)
 */
export async function cleanupExpiredCache(): Promise<CleanupResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("cleanup_expired_response_cache");

  if (error) {
    console.error("Failed to cleanup expired cache:", error);
    throw new Error(`Cache cleanup failed: ${error.message}`);
  }

  const result = data?.[0] as CleanupResult | undefined;

  if (result) {
    console.log(
      `🧹 Cleaned up ${result.deleted_count} expired cache entries (oldest: ${
        result.oldest_expired || "N/A"
      })`
    );
  }

  return result || { deleted_count: 0, oldest_expired: null };
}

/**
 * Manually clear all cache entries for a specific bot
 * Useful when bot documentation or system prompt changes significantly
 */
export async function clearBotCache(botId: string): Promise<number> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("bot_response_cache")
    .delete()
    .eq("bot_id", botId)
    .select("id");

  if (error) {
    console.error("Failed to clear bot cache:", error);
    throw new Error(`Failed to clear bot cache: ${error.message}`);
  }

  const deletedCount = data?.length || 0;
  console.log(`🗑️ Cleared ${deletedCount} cache entries for bot ${botId}`);

  return deletedCount;
}

/**
 * Clear all expired cache entries (manual trigger)
 * Useful for immediate cleanup without waiting for scheduled job
 */
export async function clearExpiredCache(): Promise<number> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("bot_response_cache")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("Failed to clear expired cache:", error);
    throw new Error(`Failed to clear expired cache: ${error.message}`);
  }

  const deletedCount = data?.length || 0;
  console.log(`🧹 Cleared ${deletedCount} expired cache entries`);

  return deletedCount;
}
