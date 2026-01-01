// lib/chat/canned-responses.ts
// Pre-LLM pattern matching for instant, zero-cost responses to common queries

import type { SupabaseClient } from "@supabase/supabase-js";

export type CannedResponseAction =
  | "human_request"
  | "human_takeover_on"
  | "human_takeover_off";

export type CannedResponseActionConfig = {
  takeover_hours?: number;
  quick_reply_human_label?: string;
  quick_reply_bot_label?: string;
};

export interface CannedResponse {
  id: string;
  bot_id: string;
  team_id: string;
  pattern: string;
  pattern_type: "regex" | "keyword" | "exact";
  response: string;
  action?: CannedResponseAction | null;
  action_config?: CannedResponseActionConfig | null;
  case_sensitive: boolean;
  fuzzy_threshold: number; // 0-3, Levenshtein distance
  priority: number;
  enabled: boolean;
}

export interface MatchResult {
  matched: boolean;
  response?: string;
  matchedResponseId?: string;
  action?: CannedResponseAction | null;
  actionConfig?: CannedResponseActionConfig | null;
}

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed to transform one string into another
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a matrix
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Normalize input text for matching
 */
function normalizeInput(text: string, caseSensitive: boolean): string {
  const trimmed = text.trim();
  return caseSensitive ? trimmed : trimmed.toLowerCase();
}

/**
 * Check if a pattern matches using regex
 */
function matchRegex(
  pattern: string,
  input: string,
  caseSensitive: boolean
): boolean {
  try {
    const flags = caseSensitive ? "g" : "gi";
    // If pattern contains pipe (|), it's multiple alternatives - wrap each separately
    // If pattern starts with ^, use as-is (already anchored)
    // Otherwise, add word boundaries around the entire pattern
    let regexPattern: string;
    if (pattern.includes("|") && !pattern.startsWith("^")) {
      // Split by pipe and wrap each alternative with word boundaries
      const alternatives = pattern.split("|").map((alt) => alt.trim());
      regexPattern = alternatives.map((alt) => `\\b${alt}\\b`).join("|");
    } else if (pattern.startsWith("^")) {
      regexPattern = pattern;
    } else {
      regexPattern = `\\b${pattern}\\b`;
    }
    const regex = new RegExp(regexPattern, flags);
    return regex.test(input);
  } catch (error) {
    // Invalid regex pattern
    console.error("Invalid regex pattern:", pattern, error);
    return false;
  }
}

/**
 * Check if a pattern matches using keyword/phrase matching
 * Supports pipe-separated alternatives (e.g., "how are you|what's up")
 *
 * STRICT MATCHING: Requires keywords to appear as whole words and in close proximity
 * to prevent false matches. Single keywords require word boundaries.
 */
function matchKeyword(
  pattern: string,
  input: string,
  caseSensitive: boolean
): boolean {
  const normalizedInput = normalizeInput(input, caseSensitive);

  // Split by pipe to handle alternatives (OR logic)
  const alternatives = pattern.split("|").map((alt) => alt.trim());

  // Check if any alternative matches
  for (const alternative of alternatives) {
    const normalizedAlt = normalizeInput(alternative, caseSensitive);
    const keywords = normalizedAlt.split(/\s+/).filter(Boolean);

    // Single keyword: require word boundary match (strict)
    if (keywords.length === 1) {
      const keyword = keywords[0];
      // Use word boundary regex to ensure it's a whole word match
      const wordBoundaryRegex = new RegExp(
        `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        caseSensitive ? "g" : "gi"
      );
      if (wordBoundaryRegex.test(normalizedInput)) {
        return true;
      }
      continue;
    }

    // Multi-keyword pattern: require ALL keywords present AND in close proximity (within 2 words)
    // First check if all keywords are present as whole words
    const words = normalizedInput.split(/\s+/);
    const keywordPositions: number[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      // Check if this word exactly matches any keyword (whole word match)
      for (const keyword of keywords) {
        // Exact word match or word contains keyword as whole word
        if (
          word === keyword ||
          new RegExp(
            `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            caseSensitive ? "g" : "gi"
          ).test(word)
        ) {
          keywordPositions.push(i);
          break; // Found a match for this keyword, move to next word
        }
      }
    }

    // All keywords must be found
    if (keywordPositions.length !== keywords.length) {
      continue; // Try next alternative
    }

    // Check if keywords appear in close proximity (within 2 words of each other)
    keywordPositions.sort((a, b) => a - b);

    let allClose = true;
    for (let i = 1; i < keywordPositions.length; i++) {
      const distance = keywordPositions[i] - keywordPositions[i - 1];
      if (distance > 2) {
        // Stricter: within 2 words (was 3)
        allClose = false;
        break;
      }
    }

    if (allClose) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a pattern matches using exact string matching
 */
function matchExact(
  pattern: string,
  input: string,
  caseSensitive: boolean
): boolean {
  const normalizedPattern = normalizeInput(pattern, caseSensitive);
  const normalizedInput = normalizeInput(input, caseSensitive);
  return normalizedPattern === normalizedInput;
}

/**
 * Check if a pattern matches using fuzzy matching (Levenshtein distance)
 */
function matchFuzzy(
  pattern: string,
  input: string,
  threshold: number,
  caseSensitive: boolean
): boolean {
  if (threshold === 0) return false; // Fuzzy matching disabled

  const normalizedPattern = normalizeInput(pattern, caseSensitive);
  const normalizedInput = normalizeInput(input, caseSensitive);

  // Try exact match first (distance 0)
  if (normalizedPattern === normalizedInput) return true;

  // Check if pattern is a substring (common case)
  if (normalizedInput.includes(normalizedPattern)) return true;

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(normalizedPattern, normalizedInput);
  return distance <= threshold;
}

/**
 * Check if a canned response matches the input message
 */
function matchesPattern(response: CannedResponse, input: string): boolean {
  if (!response.enabled) return false;

  const normalizedInput = normalizeInput(input, response.case_sensitive);

  // Try primary matching strategy based on pattern_type
  let matched = false;

  switch (response.pattern_type) {
    case "regex":
      matched = matchRegex(response.pattern, input, response.case_sensitive);
      break;
    case "keyword":
      matched = matchKeyword(response.pattern, input, response.case_sensitive);
      break;
    case "exact":
      matched = matchExact(response.pattern, input, response.case_sensitive);
      break;
  }

  // If primary match failed and fuzzy matching is enabled, try fuzzy match
  // BUT: Only use fuzzy matching for exact pattern types, not keyword/regex
  // Fuzzy matching can cause false positives for keyword patterns
  if (
    !matched &&
    response.fuzzy_threshold > 0 &&
    response.pattern_type === "exact"
  ) {
    matched = matchFuzzy(
      response.pattern,
      input,
      response.fuzzy_threshold,
      response.case_sensitive
    );
  }

  return matched;
}

/**
 * Check for canned responses matching the input message
 * Returns the first matching response (by priority) or null
 */
export async function checkCannedResponses({
  message,
  botId,
  teamId,
  supabase,
}: {
  message: string;
  botId: string;
  teamId?: string | null;
  supabase: SupabaseClient;
}): Promise<MatchResult | null> {
  if (!message || !botId) {
    return null;
  }

  try {
    // Fetch enabled canned responses for this bot, ordered by priority (highest first)
    const query = supabase
      .from("bot_canned_responses")
      .select("*")
      .eq("bot_id", botId)
      .eq("enabled", true)
      .order("priority", { ascending: false });

    // Add team_id filter if provided (for RLS)
    if (teamId) {
      query.eq("team_id", teamId);
    }

    const { data: responses, error } = await query;

    if (error) {
      console.error("Error fetching canned responses:", error);
      return null;
    }

    if (!responses || responses.length === 0) {
      return null;
    }

    // Check each response in priority order
    for (const response of responses) {
      if (matchesPattern(response as CannedResponse, message)) {
        return {
          matched: true,
          response: response.response,
          matchedResponseId: response.id,
          action: response.action ?? null,
          actionConfig:
            response.action_config && typeof response.action_config === "object"
              ? (response.action_config as CannedResponseActionConfig)
              : null,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error checking canned responses:", error);
    return null;
  }
}

/**
 * Get all canned responses for a bot (for management UI)
 */
export async function getCannedResponses({
  botId,
  teamId,
  supabase,
}: {
  botId: string;
  teamId?: string | null;
  supabase: SupabaseClient;
}): Promise<CannedResponse[]> {
  try {
    const query = supabase
      .from("bot_canned_responses")
      .select("*")
      .eq("bot_id", botId)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (teamId) {
      query.eq("team_id", teamId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching canned responses:", error);
      return [];
    }

    return (data || []) as CannedResponse[];
  } catch (error) {
    console.error("Error getting canned responses:", error);
    return [];
  }
}
