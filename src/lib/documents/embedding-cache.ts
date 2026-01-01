// src/lib/documents/embedding-cache.ts
// Chunk caching implementation to reduce OpenAI API calls
// Team-scoped and model-versioned for safety

import type { SupabaseClient } from "@supabase/supabase-js";

export const EMBEDDING_MODEL_VERSION = "text-embedding-3-small-v1";

interface CachedEmbedding {
  vector: number[];
  hash: string;
  team_id: string;
  model_version: string;
}

/**
 * Looks up a cached embedding by chunk hash.
 * Only returns cache hits within the same team and model version.
 */
export async function getCachedEmbedding(
  supabase: SupabaseClient,
  hash: string,
  teamId: string
): Promise<CachedEmbedding | null> {
  const { data, error } = await supabase
    .from("bot_embedding_cache")
    .select("vector, hash, team_id, model_version")
    .eq("hash", hash)
    .eq("team_id", teamId)
    .eq("model_version", EMBEDDING_MODEL_VERSION)
    .maybeSingle();

  if (error) {
    console.error("Failed to lookup cached embedding", error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Increment usage count (fire and forget - don't block on this)
  void (async () => {
    const { error } = await supabase.rpc("increment_cache_usage", {
      p_hash: hash,
      p_team_id: teamId,
      p_model_version: EMBEDDING_MODEL_VERSION,
    });
    if (error) {
      console.error("Failed to increment cache usage", error);
    }
  })();

  return {
    vector: data.vector as number[],
    hash: data.hash,
    team_id: data.team_id,
    model_version: data.model_version,
  };
}

/**
 * Stores an embedding in the cache.
 * Uses upsert to handle race conditions (multiple workers processing same hash).
 */
export async function storeCachedEmbedding(
  supabase: SupabaseClient,
  hash: string,
  teamId: string,
  vector: number[]
): Promise<void> {
  const { error } = await supabase
    .from("bot_embedding_cache")
    .upsert(
      {
        hash,
        team_id: teamId,
        model_version: EMBEDDING_MODEL_VERSION,
        vector,
        usage_count: 1,
        last_used_at: new Date().toISOString(),
      },
      {
        onConflict: "hash,team_id,model_version",
        ignoreDuplicates: false, // Update if exists
      }
    );

  if (error) {
    console.error("Failed to store cached embedding", error);
    // Don't throw - caching is optional, don't break embedding flow
  }
}

/**
 * Gets cache statistics for monitoring.
 */
export async function getCacheStats(
  supabase: SupabaseClient,
  teamId?: string
): Promise<{
  totalEntries: number;
  totalUsageCount: number;
  oldestEntry: string | null;
  newestEntry: string | null;
}> {
  let query = supabase
    .from("bot_embedding_cache")
    .select("usage_count, created_at, last_used_at");

  if (teamId) {
    query = query.eq("team_id", teamId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return {
      totalEntries: 0,
      totalUsageCount: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }

  const totalUsageCount = data.reduce(
    (sum, entry) => sum + (entry.usage_count || 0),
    0
  );

  const dates = data
    .map((entry) => entry.created_at)
    .filter((d): d is string => d !== null)
    .sort();

  return {
    totalEntries: data.length,
    totalUsageCount,
    oldestEntry: dates[0] || null,
    newestEntry: dates[dates.length - 1] || null,
  };
}

