// lib/chat/response-cache.ts
// Automatic response caching with embedding-based similarity matching

import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { env } from "@/lib/env";
import { logCostTrackingAsync, calculateCost } from "@/lib/cost-tracking";

const EMBEDDING_MODEL = "text-embedding-3-small";
// Reduced TTL to 7 days to prevent stale responses as the app evolves
// Cached responses can become inaccurate as documentation, features, and answers change
const CACHE_TTL_DAYS = 7;
// Use high similarity threshold (0.95) to prioritize accuracy while allowing more paraphrases
// Only return cached responses for near-exact matches to avoid inaccurate answers
// This ensures queries without good matches go to OpenAI for accurate responses
const SIMILARITY_THRESHOLD = 0.95;

export interface CachedResponse {
  id: string;
  message: string;
  response: string;
  similarity: number;
  hit_count: number;
}

/**
 * Normalize message for caching (lowercase, trim, remove extra spaces)
 */
export function normalizeMessage(message: string): string {
  return message
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/[^\w\s]/g, ""); // Remove punctuation (optional - may want to keep some)
}

/**
 * Generate SHA256 hash of a string
 */
function hashString(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Generate cache key from normalized message and system prompt hash
 */
export function generateCacheKey(
  normalizedMessage: string,
  systemPromptHash: string
): string {
  return hashString(`${normalizedMessage}:${systemPromptHash}`);
}

/**
 * Generate hash of bot's system prompt for cache invalidation
 */
export function hashSystemPrompt(systemPrompt: string | null): string {
  return hashString(systemPrompt || "");
}

/**
 * Generate embedding for a message using OpenAI API
 * Optionally tracks cost if team_id/bot_id are provided
 */
async function generateMessageEmbedding(
  message: string,
  options?: {
    teamId?: string | null;
    botId?: string | null;
    userId?: string | null;
    ipAddress?: string | null;
  }
): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: message,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message =
      payload?.error?.message ?? `${response.status} ${response.statusText}`;
    throw new Error(`Embedding request failed: ${message}`);
  }

  const json = (await response.json()) as {
    data?: Array<{ embedding: number[] }>;
    usage?: {
      prompt_tokens: number;
      total_tokens: number;
    };
  };

  const embedding = json.data?.[0]?.embedding;

  if (!embedding) {
    throw new Error("Embedding response missing vector data.");
  }

  // Log embedding generation cost (async, fire-and-forget) if context provided
  if (options) {
    const estimatedTokens =
      json.usage?.total_tokens || Math.ceil(message.length / 4); // Rough estimate: ~4 chars per token
    // Calculate cost using database pricing (with fallback)
    // Note: We don't have supabase client here, so it will use fallback or cached pricing
    const cost = await calculateCost(EMBEDDING_MODEL, estimatedTokens, 0);

    logCostTrackingAsync({
      team_id: options.teamId || null,
      bot_id: options.botId || null,
      user_id: options.userId || null,
      cost_type: "embedding",
      model: EMBEDDING_MODEL,
      input_tokens: estimatedTokens,
      output_tokens: 0,
      total_tokens: estimatedTokens,
      cost_usd: cost,
      cache_hit: false,
      ip_address: options.ipAddress || null,
      metadata: {
        purpose: "response_cache_embedding",
        message_length: message.length,
      },
    });
  }

  return embedding;
}

/**
 * Check cache for exact match (cache_key) first, then similarity search
 */
export async function checkResponseCache({
  message,
  botId,
  teamId,
  systemPromptHash,
  supabase,
}: {
  message: string;
  botId: string;
  teamId: string;
  systemPromptHash: string;
  supabase: SupabaseClient;
}): Promise<CachedResponse | null> {
  // Normalize message
  const normalizedMessage = normalizeMessage(message);
  const cacheKey = generateCacheKey(normalizedMessage, systemPromptHash);

  // First, try exact match using cache_key
  const { data: exactMatch, error: exactError } = await supabase
    .from("bot_response_cache")
    .select("id, message, response, hit_count")
    .eq("bot_id", botId)
    .eq("cache_key", cacheKey)
    .eq("system_prompt_hash", systemPromptHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (exactMatch && !exactError) {
    // Increment hit count
    await supabase
      .from("bot_response_cache")
      .update({ hit_count: exactMatch.hit_count + 1 })
      .eq("id", exactMatch.id);

    return {
      id: exactMatch.id,
      message: exactMatch.message,
      response: exactMatch.response,
      similarity: 1.0, // Exact match
      hit_count: exactMatch.hit_count + 1,
    };
  }

  // If no exact match, try similarity search
  try {
    const queryEmbedding = await generateMessageEmbedding(normalizedMessage, {
      teamId,
      botId,
    });

    const { data: similarMatches, error: similarityError } = await supabase.rpc(
      "match_cached_responses",
      {
        p_query_embedding: queryEmbedding,
        p_bot_id: botId,
        p_system_prompt_hash: systemPromptHash,
        p_similarity_threshold: SIMILARITY_THRESHOLD,
        p_limit: 1,
      }
    );

    if (similarityError || !similarMatches || similarMatches.length === 0) {
      return null;
    }

    const match = similarMatches[0] as {
      id: string;
      message: string;
      response: string;
      similarity: number;
      hit_count: number;
    };

    // Double-check similarity threshold (safety check)
    // Only return if similarity is very high to ensure accuracy
    if (match.similarity < SIMILARITY_THRESHOLD) {
      console.log(
        `⚠️ Cache match found but similarity (${match.similarity.toFixed(
          3
        )}) below threshold (${SIMILARITY_THRESHOLD}), skipping cache for accuracy. Original: "${
          match.message
        }", Query: "${normalizedMessage}"`
      );
      return null;
    }

    console.log(
      `✅ Cache match found with high similarity (${match.similarity.toFixed(
        3
      )}): Original: "${match.message}", Query: "${normalizedMessage}"`
    );

    // Increment hit count
    await supabase
      .from("bot_response_cache")
      .update({ hit_count: match.hit_count + 1 })
      .eq("id", match.id);

    return {
      id: match.id,
      message: match.message,
      response: match.response,
      similarity: match.similarity,
      hit_count: match.hit_count + 1,
    };
  } catch (error) {
    // If embedding generation fails, log and return null (graceful degradation)
    console.error("Failed to check response cache (similarity search):", error);
    return null;
  }
}

/**
 * Save response to cache after OpenAI API call
 */
export async function saveResponseToCache({
  message,
  response,
  botId,
  teamId,
  systemPromptHash,
  supabase,
}: {
  message: string;
  response: string;
  botId: string;
  teamId: string;
  systemPromptHash: string;
  supabase: SupabaseClient;
}): Promise<void> {
  try {
    const normalizedMessage = normalizeMessage(message);
    const cacheKey = generateCacheKey(normalizedMessage, systemPromptHash);

    // Generate embedding for the message (with cost tracking context)
    const messageEmbedding = await generateMessageEmbedding(normalizedMessage, {
      teamId,
      botId,
    });

    // Calculate expiration date (7 days from now to prevent stale responses)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

    // Upsert cache entry (update if exists, insert if not)
    const { error } = await supabase.from("bot_response_cache").upsert(
      {
        bot_id: botId,
        team_id: teamId,
        cache_key: cacheKey,
        message: normalizedMessage,
        response: response,
        message_embedding: messageEmbedding,
        system_prompt_hash: systemPromptHash,
        expires_at: expiresAt.toISOString(),
        hit_count: 0, // Reset hit count on update
      },
      {
        onConflict: "bot_id,cache_key",
        ignoreDuplicates: false,
      }
    );

    if (error) {
      console.error("Failed to save response to cache:", error);
      // Don't throw - cache saving is non-critical
    }
  } catch (error) {
    console.error("Error saving response to cache:", error);
    // Don't throw - cache saving is non-critical
  }
}

/**
 * Invalidate cache entries for a bot (e.g., when system prompt changes)
 */
export async function invalidateBotCache({
  botId,
  systemPromptHash,
  supabase,
}: {
  botId: string;
  systemPromptHash?: string; // If provided, only invalidate entries with different hash
  supabase: SupabaseClient;
}): Promise<void> {
  try {
    let query = supabase
      .from("bot_response_cache")
      .delete()
      .eq("bot_id", botId);

    // If systemPromptHash provided, only delete entries with different hash
    if (systemPromptHash) {
      query = query.neq("system_prompt_hash", systemPromptHash);
    }

    const { error } = await query;

    if (error) {
      console.error("Failed to invalidate bot cache:", error);
    }
  } catch (error) {
    console.error("Error invalidating bot cache:", error);
  }
}

/**
 * Simulate streaming for cached responses (for UX consistency)
 */
export async function streamCachedResponse(
  response: string,
  onDelta: (chunk: string) => Promise<void> | void
): Promise<void> {
  // Chunk response into ~15 character pieces for natural streaming
  const chunkSize = 15;
  const chunks: string[] = [];

  for (let i = 0; i < response.length; i += chunkSize) {
    chunks.push(response.slice(i, i + chunkSize));
  }

  // Stream chunks with small delays for natural feel
  for (const chunk of chunks) {
    await onDelta(chunk);
    // Small delay to simulate streaming (10-20ms per chunk)
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
}
