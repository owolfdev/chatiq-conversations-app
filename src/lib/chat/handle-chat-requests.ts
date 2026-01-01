// lib/chat/handle-chat-requests.ts

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  enforceRateLimit,
  enforceIpBasedRateLimit,
} from "@/lib/middleware/rate-limit";
import { validateContent } from "@/lib/middleware/moderation";
import { saveChatToDatabase } from "./save-chat";
import { env } from "@/lib/env";
import { DEFAULT_BOT_SLUG } from "@/lib/config";
import bcrypt from "bcryptjs";
import {
  retrieveDeterministicChunks,
  retrieveRelevantChunks,
} from "@/lib/documents/retrieval";
import {
  ensureQuotaAllows,
  incrementOpenAiApiCallCount,
  QuotaExceededError,
  type PlanId,
  getPlanPeriod,
} from "@/lib/teams/usage";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  checkCannedResponses,
  type CannedResponseAction,
  type CannedResponseActionConfig,
} from "./canned-responses";
import {
  checkResponseCache,
  saveResponseToCache,
  hashSystemPrompt,
  streamCachedResponse,
} from "./response-cache";
import {
  logCostTrackingAsync,
  calculateCost,
  type CostTrackingData,
} from "@/lib/cost-tracking";
import {
  isFreeTierExpired,
  getFreeTierDaysRemaining,
} from "@/lib/plans/free-tier-expiry";

type ResponseSource = "canned" | "cache" | "llm" | "deterministic";

const logResponseSource = ({
  source,
  botId,
  teamId,
  userId,
  note,
}: {
  source: ResponseSource;
  botId?: string | null;
  teamId?: string | null;
  userId?: string | null;
  note?: string;
}) => {
  console.log(
    `[response-source] ${source}`,
    JSON.stringify({
      bot_id: botId || null,
      team_id: teamId || null,
      user_id: userId || null,
      note: note || undefined,
    })
  );
};

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type ChatRequest = {
  message: string;
  ip?: string;
  userAgent?: string;
  apiKey?: string;
  bot_slug?: string;
  bot_id?: string;
  source?: string;
  source_detail?: Record<string, unknown>;
  history?: Message[];
  conversation_id?: string;
  isInternal?: boolean;
  private_mode?: boolean; // When true, don't save conversation to database
  origin?: string; // Origin/referer for domain whitelisting validation
};

export type ChatResponse = {
  response: string;
  conversationId?: string;
  input?: string; // Include input message for verification/debugging
  lineQuickReplies?: LineQuickReply[];
};

type BotRecord = {
  id: string;
  system_prompt: string | null;
  team_id?: string | null;
  is_public?: boolean;
  status?: string;
  default_response?: string | null;
  rich_responses_enabled?: boolean;
  llm_enabled?: boolean;
};

const MAX_HISTORY_MESSAGES = 10;
const MODEL_MAX_TOKENS = 4096;
const DEFAULT_TAKEOVER_HOURS = 15;
const NEEDS_HUMAN_TOPIC = "Needs Human";

type LineQuickReply = {
  label: string;
  text: string;
};

/**
 * Select OpenAI model based on plan
 * Free tier and public requests use the cheapest model (gpt-3.5-turbo)
 * Paid plans can use better models (currently also gpt-3.5-turbo, but can be upgraded later)
 */
function selectModelForPlan(plan: PlanId, isPublic: boolean): string {
  // Free tier and public requests always use the cheapest model
  if (plan === "free" || isPublic) {
    return "gpt-3.5-turbo";
  }

  // Paid plans: currently using gpt-3.5-turbo, but can be upgraded to gpt-4o-mini or gpt-4o later
  // For now, all plans use gpt-3.5-turbo for cost efficiency
  return "gpt-3.5-turbo";
}
const TOKEN_BUFFER = 500;
const DEFAULT_DETERMINISTIC_TOP_K = 4;
const DEFAULT_DETERMINISTIC_EXCERPT_CHARS = 350;

const buildLineQuickReplies = (
  config: CannedResponseActionConfig | null
): LineQuickReply[] => {
  const humanLabel =
    typeof config?.quick_reply_human_label === "string" &&
    config.quick_reply_human_label.trim()
      ? config.quick_reply_human_label.trim()
      : "Human";
  const botLabel =
    typeof config?.quick_reply_bot_label === "string" &&
    config.quick_reply_bot_label.trim()
      ? config.quick_reply_bot_label.trim()
      : "Bot";

  return [
    { label: humanLabel, text: "human" },
    { label: botLabel, text: "bot" },
  ];
};

const normalizeTakeoverHours = (
  config: CannedResponseActionConfig | null
): number => {
  const raw = config?.takeover_hours;
  const parsed =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
      ? Number(raw)
      : Number.NaN;
  if (Number.isNaN(parsed)) {
    return DEFAULT_TAKEOVER_HOURS;
  }
  return Math.max(1, Math.min(72, parsed));
};

const applyCannedResponseAction = async ({
  action,
  actionConfig,
  conversationId,
  source,
  supabase,
}: {
  action?: CannedResponseAction | null;
  actionConfig?: CannedResponseActionConfig | null;
  conversationId?: string;
  source?: string;
  supabase: SupabaseClient;
}): Promise<{ lineQuickReplies?: LineQuickReply[] }> => {
  if (!action || !conversationId) {
    return {};
  }

  const updates: Record<string, unknown> = {};
  if (action === "human_request" || action === "human_takeover_on") {
    updates.topic = NEEDS_HUMAN_TOPIC;
    updates.topic_source = "manual";
    updates.topic_confidence = null;
    updates.topic_updated_at = new Date().toISOString();
    updates.topic_message_preview = null;
    updates.topic_message_at = null;
  }

  if (action === "human_takeover_on") {
    const hours = normalizeTakeoverHours(actionConfig ?? null);
    updates.human_takeover = true;
    updates.human_takeover_until = new Date(
      Date.now() + hours * 60 * 60 * 1000
    ).toISOString();
  }

  if (action === "human_takeover_off") {
    updates.human_takeover = false;
    updates.human_takeover_until = null;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("bot_conversations")
      .update(updates)
      .eq("id", conversationId);
    if (error) {
      console.error("Failed to apply canned response action", error);
    }
  }

  if (action === "human_request" && source === "line") {
    return { lineQuickReplies: buildLineQuickReplies(actionConfig ?? null) };
  }

  return {};
};

async function fetchConversationHistory({
  client,
  conversationId,
  limit = MAX_HISTORY_MESSAGES,
}: {
  client: SupabaseClient;
  conversationId: string;
  limit?: number;
}): Promise<Message[]> {
  const { data, error } = await client
    .from("bot_messages")
    .select("sender, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) {
      console.error("Failed to load conversation history", error);
    }
    return [];
  }

  return data
    .map((row) => {
      const sender = (row.sender as string) ?? "";
      const content = typeof row.content === "string" ? row.content : null;
      if (!content) {
        return null;
      }

      if (sender === "bot") {
        return { role: "assistant", content } as Message;
      }

      if (sender === "user") {
        return { role: "user", content } as Message;
      }

      return null;
    })
    .filter((value): value is Message => Boolean(value))
    .reverse();
}

function trimHistoryToFitTokenLimit(
  history: Message[],
  tokenAllowance: number
): { messages: Message[]; tokenCount: number } {
  if (!history.length || tokenAllowance <= 0) {
    return { messages: [], tokenCount: 0 };
  }

  const selected: Message[] = [];
  let usedTokens = 0;

  for (let i = history.length - 1; i >= 0; i--) {
    const message = history[i];
    const tokenCost = countTokens(message.content);
    if (tokenCost > tokenAllowance) {
      continue;
    }
    if (usedTokens + tokenCost > tokenAllowance) {
      break;
    }
    selected.push(message);
    usedTokens += tokenCost;
  }

  return {
    messages: selected.reverse(),
    tokenCount: usedTokens,
  };
}

function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeQueryTerms(query: string): string[] {
  const cleaned = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return [];
  }

  return cleaned
    .split(" ")
    .map((term) => term.trim())
    .filter((term) => term.length >= 3)
    .filter((term) => !COMMON_STOP_WORDS.has(term))
    .map((term) => {
      if (term.length > 4 && term.endsWith("s")) {
        return term.slice(0, -1);
      }
      return term;
    });
}

const COMMON_STOP_WORDS = new Set([
  "the",
  "and",
  "are",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "how",
  "with",
  "from",
  "that",
  "this",
  "these",
  "those",
  "your",
  "you",
  "our",
  "for",
  "but",
  "not",
  "have",
  "has",
  "had",
  "can",
  "will",
  "would",
  "should",
  "could",
  "just",
  "like",
  "than",
  "then",
  "into",
  "over",
  "also",
  "there",
  "their",
  "them",
  "about",
]);

function extractDeterministicExcerpt(
  content: string,
  query: string,
  maxChars: number
): string {
  const raw = content.trim();
  if (!raw) {
    return "";
  }

  const terms = normalizeQueryTerms(query);

  const lowerContent = raw.toLowerCase();
  let bestIndex = -1;

  for (const term of terms) {
    const index = lowerContent.indexOf(term);
    if (index >= 0) {
      bestIndex = index;
      break;
    }
  }

  if (bestIndex < 0) {
    return raw.slice(0, maxChars).trim();
  }

  const lead = Math.floor(maxChars * 0.25);
  const start = Math.max(0, bestIndex - lead);
  const end = Math.min(raw.length, start + maxChars);
  let excerpt = raw.slice(start, end).trim();

  if (start > 0) {
    excerpt = `...${excerpt}`;
  }
  if (end < raw.length) {
    excerpt = `${excerpt}...`;
  }

  return excerpt;
}

function buildDeterministicResponse(
  chunks: { content: string; canonicalUrl?: string | null; anchorId?: string | null }[],
  query: string,
  maxChars: number,
  allowReadMore: boolean
): string {
  if (chunks.length === 0) {
    return "";
  }

  const terms = normalizeQueryTerms(query);
  const primary =
    terms.length > 0
      ? chunks.find((chunk) => {
          const normalized = normalizeWhitespace(chunk.content).toLowerCase();
          return terms.some((term) => normalized.includes(term));
        }) ?? chunks[0]
      : chunks[0];
  const excerpt = extractDeterministicExcerpt(primary.content, query, maxChars);
  if (!excerpt) {
    return "";
  }

  if (!allowReadMore || !primary.canonicalUrl) {
    return excerpt;
  }

  const anchor = primary.anchorId ? `#${primary.anchorId}` : "";
  const readMoreUrl = `${primary.canonicalUrl}${anchor}`;
  return `${excerpt}\n\n[Read more](${readMoreUrl})`;
}

async function tryDeterministicFallback({
  supabase,
  teamId,
  botId,
  query,
  useAdminClient,
  topK = DEFAULT_DETERMINISTIC_TOP_K,
  maxChars = DEFAULT_DETERMINISTIC_EXCERPT_CHARS,
  allowReadMore,
}: {
  supabase: SupabaseClient;
  teamId?: string | null;
  botId: string;
  query: string;
  useAdminClient: boolean;
  topK?: number;
  maxChars?: number;
  allowReadMore: boolean;
}): Promise<string | null> {
  if (!teamId) {
    return null;
  }

  try {
    const retrievalClient = useAdminClient ? createAdminClient() : supabase;
    const chunks = await retrieveDeterministicChunks({
      supabase: retrievalClient,
      teamId,
      botId,
      query,
      topK,
    });

    if (chunks.length === 0) {
      return null;
    }

    const response = buildDeterministicResponse(
      chunks,
      query,
      maxChars,
      allowReadMore
    );
    return response || null;
  } catch (error) {
    console.error("Deterministic retrieval failed", error);
    return null;
  }
}

export async function handleChatRequest(
  input: ChatRequest,
  onDelta?: (chunk: string) => Promise<void> | void
): Promise<ChatResponse> {
  const {
    message,
    ip,
    userAgent,
    apiKey,
    bot_slug,
    bot_id,
    source,
    source_detail,
    history: providedHistory,
    conversation_id,
    isInternal,
    origin,
  } = input;
  const sourceDetail = source_detail;
  const saveChat = (options: Parameters<typeof saveChatToDatabase>[0]) =>
    saveChatToDatabase({ ...options, source, sourceDetail });
  if (!message || typeof message !== "string") {
    throw new Error("Invalid input: message required");
  }

  const supabase = await createClient();
  let botId: string | undefined;
  let teamId: string | undefined;
  let userId: string | undefined;
  let planId: PlanId = "free";
  let teamCreatedAt: string | null = null;
  let teamTrialEndsAt: string | null = null;

  // Declare apiKeyData outside the if block so it's accessible later
  let apiKeyData: {
    id: string;
    bot_id: string | null;
    team_id: string | null;
    is_shared_public_key: boolean;
    is_system_key: boolean;
  } | null = null;

  // Determine if this is a public request EARLY (before any team lookups)
  // Public = not internal, no API key, and we'll check userId after session lookup
  // SECURITY: External requests (not internal) MUST have an API key
  const isPublicRequest = !isInternal && !apiKey;

  // SECURITY: Block external requests without API keys
  // This prevents unauthorized access and quota abuse
  // Only internal app requests (isInternal: true) can proceed without API keys
  if (!isInternal && !apiKey) {
    const error = new Error(
      "API key required for external requests. Please provide an API key in the Authorization header."
    );
    error.name = "UnauthorizedError";
    throw error;
  }

  if (apiKey) {
    // External API request with API key
    // API keys are now stored as bcrypt hashes, so we need to compare
    // Use admin client to bypass RLS for API key lookup (we don't have auth context yet)
    // This is safe because we only compare hashes and don't expose sensitive data
    const adminClient = createAdminClient();
    const { data: allApiKeys, error: keysError } = await adminClient
      .from("bot_api_keys")
      .select("id, bot_id, team_id, key, allowed_domains")
      .eq("active", true);

    if (keysError) {
      throw new Error("Failed to validate API key");
    }

    // Find matching key by comparing hash
    for (const keyRecord of allApiKeys || []) {
      const isMatch = await bcrypt.compare(apiKey, keyRecord.key);
      if (isMatch) {
        // Validate domain whitelisting if configured
        if (
          keyRecord.allowed_domains &&
          Array.isArray(keyRecord.allowed_domains) &&
          keyRecord.allowed_domains.length > 0
        ) {
          if (!origin) {
            throw new Error(
              "Domain whitelisting is enabled for this API key, but origin header is missing"
            );
          }

          // Extract domain from origin (e.g., "https://example.com" -> "example.com")
          const originUrl = new URL(origin);
          const originDomain = originUrl.hostname;

          // Check if origin domain matches any allowed domain
          const isAllowed = keyRecord.allowed_domains.some(
            (allowedDomain: string) => {
              // Remove protocol if present
              const domain = allowedDomain
                .replace(/^https?:\/\//, "")
                .replace(/\/$/, "");
              // Support exact match or subdomain match (e.g., "example.com" matches "www.example.com")
              return (
                originDomain === domain || originDomain.endsWith("." + domain)
              );
            }
          );

          if (!isAllowed) {
            throw new Error(
              `API key is restricted to specific domains. Request origin "${originDomain}" is not allowed.`
            );
          }
        }

        apiKeyData = {
          id: keyRecord.id,
          bot_id: keyRecord.bot_id,
          team_id: keyRecord.team_id,
          is_shared_public_key: keyRecord.bot_id === null,
          is_system_key:
            keyRecord.bot_id === null && keyRecord.team_id === null,
        };
        break;
      }
    }

    if (!apiKeyData) {
      throw new Error("Invalid API key");
    }

    // Handle shared public API keys (bot_id is NULL)
    // System keys (team_id = NULL) can access any public bot across all teams
    // Team keys (team_id = NOT NULL) can access public bots in their team
    if (apiKeyData.is_shared_public_key) {
      // For shared keys, we need bot_slug to look up the bot
      if (!bot_slug) {
        throw new Error("Bot slug required when using shared public API key");
      }
      // botId will be set later when we look up by slug
      // For system keys, teamId will come from the bot (not the key)
      // For team keys, we can use the key's team_id for rate limiting
      if (!apiKeyData.is_system_key && apiKeyData.team_id) {
        teamId = apiKeyData.team_id;
      }
    } else {
      // Regular bot-specific key
      botId = apiKeyData.bot_id!;
      teamId = apiKeyData.team_id!;
    }

    // For shared public keys, we'll get teamId from the bot lookup below
    // For regular keys, ensure teamId is set
    if (!apiKeyData.is_shared_public_key) {
      if (!teamId) {
        // Fallback: get team_id from bot if not in API key
        const { data: bot } = await supabase
          .from("bot_bots")
          .select("team_id")
          .eq("id", botId)
          .single();

        teamId = bot?.team_id;
      }

      if (!teamId) throw new Error("API key has no associated team");

      // Get team's plan for rate limiting
      const { data: team } = await supabase
        .from("bot_teams")
        .select("plan, created_at, trial_ends_at")
        .eq("id", teamId)
        .single();

      const plan = (team?.plan ?? "free") as PlanId;
      planId = plan;
      if (team?.created_at && !teamCreatedAt) {
        teamCreatedAt = team.created_at;
      }
      if (team?.trial_ends_at && !teamTrialEndsAt) {
        teamTrialEndsAt = team.trial_ends_at;
      }
    }
    // For shared keys, planId and teamId will be set after bot lookup
  } else if (bot_id) {
    // Internal server requests can specify bot_id directly
    // Use admin client to bypass RLS (no user session available)
    const adminClient = createAdminClient();
    const { data: bot } = await adminClient
      .from("bot_bots")
      .select("id, team_id")
      .eq("id", bot_id)
      .single();

    if (!bot) throw new Error("Bot not found");

    botId = bot.id;
    teamId = bot.team_id;

    if (isInternal && teamId) {
      const { data: team } = await adminClient
        .from("bot_teams")
        .select("plan, created_at, trial_ends_at")
        .eq("id", teamId)
        .single();

      const plan = (team?.plan ?? "free") as PlanId;
      planId = plan;
      if (team?.created_at && !teamCreatedAt) {
        teamCreatedAt = team.created_at;
      }
      if (team?.trial_ends_at && !teamTrialEndsAt) {
        teamTrialEndsAt = team.trial_ends_at;
      }
    }
  } else if (bot_slug) {
    // Request via bot slug (internal or public)
    const { data: bot } = await supabase
      .from("bot_bots")
      .select("id, team_id")
      .eq("slug", bot_slug)
      .single();

    if (!bot) throw new Error("Bot not found");

    botId = bot.id;
    teamId = bot.team_id;

    if (isInternal && teamId) {
      // Internal request: use team's plan
      const { data: team } = await supabase
        .from("bot_teams")
        .select("plan")
        .eq("id", teamId)
        .single();

      const plan = (team?.plan ?? "free") as PlanId;
      planId = plan;
    } else {
      // Public request without auth: use free plan limits
      // Will use IP-based rate limiting instead of team-based
      planId = "free";
    }
  }

  // Enforce rate limiting
  if (isInternal && teamId) {
    // Internal authenticated requests: use team-based rate limiting
    const rateInfo = await enforceRateLimit({
      teamId,
      plan: planId,
      context: {
        actorType: "user",
        actorId: userId,
        botId,
        route: "chat.handle",
        source: "dashboard",
        requestId: conversation_id,
        ip,
      },
    });

    console.log("rateInfo", rateInfo);
  } else if (apiKey && teamId) {
    // API key requests: use team-based rate limiting
    const rateInfo = await enforceRateLimit({
      teamId,
      plan: planId,
      context: {
        actorType: "api_key",
        actorId: apiKey,
        botId,
        route: "chat.handle",
        source: "external_api",
        requestId: conversation_id,
        ip,
      },
    });

    console.log("rateInfo", rateInfo);
  } else if (!isInternal && ip && ip !== "unknown") {
    // Public unauthenticated requests: use IP-based rate limiting
    const rateInfo = await enforceIpBasedRateLimit({
      ipAddress: ip,
      plan: "free",
      context: {
        actorType: "system",
        actorId: undefined,
        botId,
        route: "chat.handle",
        source: "public",
        requestId: conversation_id,
        ip,
      },
    });

    console.log("IP-based rateInfo", rateInfo);
  } else {
    // Fallback: skip rate limiting if we can't identify the request
    console.log("Skipping rate limit - unable to identify request source");
  }

  // Get bot details - if we have botId from API key, use it; otherwise look up by slug
  let bot: BotRecord | null = null;

  if (botId && apiKey) {
    // We already have botId from API key lookup - use admin client to bypass RLS
    // (no authenticated user session when using API key)
    const adminClient = createAdminClient();
    const { data, error: botError } = await adminClient
      .from("bot_bots")
      .select(
        "id, system_prompt, team_id, default_response, rich_responses_enabled, llm_enabled"
      )
      .eq("id", botId)
      .single();

    if (botError || !data) {
      throw new Error("Bot not found");
    }
    bot = data as BotRecord;
    // Ensure teamId is set from bot if not already set
    if (!teamId && bot.team_id) {
      teamId = bot.team_id;
    }
  } else if (botId && !apiKey) {
    // Internal server requests with bot_id - use admin client to bypass RLS
    const adminClient = createAdminClient();
    const { data, error: botError } = await adminClient
      .from("bot_bots")
      .select(
        "id, system_prompt, team_id, is_public, status, default_response, rich_responses_enabled, llm_enabled"
      )
      .eq("id", botId)
      .single();

    if (botError || !data) {
      throw new Error("Bot not found");
    }
    bot = data as BotRecord;
    if (!teamId && bot.team_id) {
      teamId = bot.team_id;
    }
  } else if (bot_slug) {
    // Look up bot by slug (for requests without API key)
    const slug = bot_slug || DEFAULT_BOT_SLUG;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        userId = user.id;
      }
    } catch (error) {
      console.error("Failed to fetch authenticated user", error);
    }

    // For public requests (isPublicRequest), use admin client to bypass RLS
    // This ensures we can always get team_id for quota checks, regardless of auth state
    // For authenticated internal requests, use regular client (respects RLS)
    const botLookupClient = isPublicRequest ? createAdminClient() : supabase;

    const { data, error: botError } = await botLookupClient
      .from("bot_bots")
      .select(
        "id, system_prompt, team_id, is_public, status, default_response, rich_responses_enabled, llm_enabled"
      )
      .eq("slug", slug)
      .single();

    if (botError || !data) {
      throw new Error("Bot not found");
    }
    bot = data as BotRecord;
    botId = bot.id;

    // SECURITY: If using shared public API key, verify bot is public and active
    if (apiKey && apiKeyData?.is_shared_public_key) {
      if (!bot.is_public || bot.status !== "active") {
        throw new Error("Bot not found"); // Don't reveal it exists
      }

      // For system keys (team_id = NULL), can access any public bot
      // For team keys (team_id = NOT NULL), verify bot belongs to the team
      if (!apiKeyData.is_system_key && apiKeyData.team_id) {
        if (bot.team_id !== apiKeyData.team_id) {
          throw new Error("Bot not found"); // Don't reveal it exists
        }
      }

      // Always use the bot's team_id for quota (not the key's team_id)
      // This ensures each bot owner's quota is respected
      if (bot.team_id) {
        teamId = bot.team_id;
      }
    } else {
      // Regular flow: ensure teamId is set from bot if not already set
      if (!teamId && bot.team_id) {
        teamId = bot.team_id;
      }
    }

    // Get team's plan for rate limiting (if not already set for regular API keys)
    if (apiKey && !apiKeyData?.is_shared_public_key && teamId && !planId) {
      const { data: team } = await supabase
        .from("bot_teams")
        .select("plan, created_at, trial_ends_at")
        .eq("id", teamId)
        .single();

      planId = (team?.plan ?? "free") as PlanId;
      if (team?.created_at && !teamCreatedAt) {
        teamCreatedAt = team.created_at;
      }
      if (team?.trial_ends_at && !teamTrialEndsAt) {
        teamTrialEndsAt = team.trial_ends_at;
      }
    } else if (teamId && !planId) {
      // For shared keys or non-API requests, get plan from bot's team
      const { data: team } = await supabase
        .from("bot_teams")
        .select("plan, created_at, trial_ends_at")
        .eq("id", teamId)
        .single();

      planId = (team?.plan ?? "free") as PlanId;
      if (team?.created_at && !teamCreatedAt) {
        teamCreatedAt = team.created_at;
      }
      if (team?.trial_ends_at && !teamTrialEndsAt) {
        teamTrialEndsAt = team.trial_ends_at;
      }
    }
  } else {
    throw new Error("Bot not specified");
  }

  if (!bot || !botId) {
    throw new Error("Bot not found");
  }
  const botRecord: BotRecord = bot;
  const botSystemPrompt = botRecord.system_prompt ?? "";

  const isInternalRequest = Boolean(isInternal);
  const hasAuthenticatedUser = Boolean(isInternalRequest && userId);
  const shouldUseAdminClient = Boolean(
    apiKey || !isInternalRequest || !hasAuthenticatedUser
  );

  if (conversation_id) {
    const takeoverClient = shouldUseAdminClient ? createAdminClient() : supabase;
    const { data: conversationState } = await takeoverClient
      .from("bot_conversations")
      .select("human_takeover, human_takeover_until")
      .eq("id", conversation_id)
      .maybeSingle();

    const takeoverUntil = conversationState?.human_takeover_until;
    const takeoverActive =
      conversationState?.human_takeover === true &&
      (!takeoverUntil || new Date(takeoverUntil).getTime() > Date.now());

    if (takeoverActive) {
      try {
        const cannedRelease = await checkCannedResponses({
          message,
          botId: botRecord.id,
          teamId,
          supabase: takeoverClient,
        });

        if (
          cannedRelease?.matched &&
          cannedRelease.action === "human_takeover_off" &&
          cannedRelease.response
        ) {
          if (onDelta) {
            await streamCachedResponse(cannedRelease.response, onDelta);
          }

          let conversationId: string | undefined;
          if (!input.private_mode) {
            conversationId = await saveChat({
              botId: botRecord.id,
              userId,
              teamId,
              message,
              response: cannedRelease.response,
              conversationId: conversation_id,
              ipAddress: ip,
              useAdminClient: shouldUseAdminClient,
              supabaseClient: shouldUseAdminClient ? undefined : supabase,
              plan: planId,
            });
          }

          const actionResult = await applyCannedResponseAction({
            action: cannedRelease.action,
            actionConfig: cannedRelease.actionConfig,
            conversationId,
            source,
            supabase: takeoverClient,
          });

          return {
            response: cannedRelease.response,
            conversationId,
            input: message,
            lineQuickReplies: actionResult.lineQuickReplies,
          };
        }
      } catch (error) {
        console.error("Error checking takeover release response:", error);
      }

      let conversationId: string | undefined;
      if (!input.private_mode) {
        conversationId = await saveChat({
          botId: botRecord.id,
          userId,
          teamId,
          message,
          response: "",
          conversationId: conversation_id,
          ipAddress: ip,
          useAdminClient: shouldUseAdminClient,
          supabaseClient: shouldUseAdminClient ? undefined : supabase,
          plan: planId,
        });
      }

      return {
        response: "",
        conversationId,
        input: message,
      };
    }
  }

  // Get last assistant message from conversation history to check for duplicate responses
  // If the same canned/cached response was returned twice, skip it and go to OpenAI
  // Also detect follow-up questions (e.g., "what about X?" after asking about Y)
  let lastAssistantMessage: string | null = null;
  let lastUserMessage: string | null = null;
  let isFollowUpQuestion = false;

  if (conversation_id) {
    try {
      const historyClient = shouldUseAdminClient
        ? createAdminClient()
        : supabase;
      const recentHistory = await fetchConversationHistory({
        client: historyClient,
        conversationId: conversation_id,
        limit: 2, // Get last 2 messages to check for follow-ups
      });
      // Get the last assistant message (if any)
      const lastAssistMsg = recentHistory
        .filter((m) => m.role === "assistant")
        .slice(-1)[0];
      if (lastAssistMsg) {
        lastAssistantMessage = lastAssistMsg.content;
      }
      // Get the last user message to detect follow-up patterns
      const lastUserMsg = recentHistory
        .filter((m) => m.role === "user")
        .slice(-1)[0];
      if (lastUserMsg) {
        lastUserMessage = lastUserMsg.content;
      }
    } catch (error) {
      // If history fetch fails, continue without duplicate check
      console.error("Error fetching last message for duplicate check:", error);
    }
  } else if (Array.isArray(providedHistory) && providedHistory.length > 0) {
    // Check provided history for last assistant message
    const lastAssistMsg = providedHistory
      .filter((m) => m.role === "assistant")
      .slice(-1)[0];
    if (lastAssistMsg) {
      lastAssistantMessage = lastAssistMsg.content;
    }
    // Get the last user message
    const lastUserMsg = providedHistory
      .filter((m) => m.role === "user")
      .slice(-1)[0];
    if (lastUserMsg) {
      lastUserMessage = lastUserMsg.content;
    }
  }

  // Detect if this is a follow-up question (user asking about something related)
  // Patterns like "what about", "how about", "tell me about", "what's", etc.
  const followUpPatterns = [
    /^(what|how|tell me|can you|could you|will you)\s+(about|is|are|does|do|tell)/i,
    /^(what|how)\s+(about|is|are|does|do)\s+/i,
    /^(and|but|also|what about|how about)/i,
  ];
  isFollowUpQuestion = followUpPatterns.some((pattern) =>
    pattern.test(message.trim())
  );

  // Helper function to detect generic responses (short, unhelpful responses that redirect users)
  const isGenericResponse = (response: string): boolean => {
    const genericPhrases = [
      "visit",
      "check",
      "see",
      "view",
      "go to",
      "open",
      "for more",
      "for details",
    ];
    const lowerResponse = response.toLowerCase();
    return (
      response.length < 200 && // Short responses are often generic
      genericPhrases.some((phrase) => lowerResponse.includes(phrase))
    );
  };

  // Get team plan and creation date for evaluation expiry checks
  if (teamId) {
    const { data: teamPlan } = await supabase
      .from("bot_teams")
      .select("plan, created_at, trial_ends_at")
      .eq("id", teamId)
      .single();

    if (teamPlan?.plan) {
      planId = (teamPlan.plan ?? "free") as PlanId;
    }
    if (teamPlan?.created_at) {
      teamCreatedAt = teamPlan.created_at;
    }
    if (teamPlan?.trial_ends_at) {
      teamTrialEndsAt = teamPlan.trial_ends_at;
    }
  }

  const evaluationExpired =
    planId === "free" &&
    teamCreatedAt &&
    isFreeTierExpired(teamCreatedAt, teamTrialEndsAt);

  const isExternalUsage =
    Boolean(apiKey) || isPublicRequest || (botRecord.is_public && !isInternal);

  if (evaluationExpired && isExternalUsage) {
    const error = new Error(
      "Evaluation period ended. API and embedded usage are disabled until you upgrade."
    );
    error.name = "EvaluationExpiredError";
    (error as any).code = "EVALUATION_EXPIRED";
    throw error;
  }

  // Check for pre-configured responses FIRST (before any expensive operations)
  // This provides instant, zero-cost responses for common queries
  try {
    const cannedResponse = await checkCannedResponses({
      message,
      botId: botRecord.id,
      teamId,
      supabase: shouldUseAdminClient ? createAdminClient() : supabase,
    });

    if (cannedResponse?.matched && cannedResponse.response) {
      // Skip pre-configured response if:
      // 1. It's the same as the last response (exact duplicate)
      // 2. It's a follow-up question AND the last response was a generic pre-configured response
      //    (indicated by it being short/generic and containing phrases like "visit", "check", "see")
      const isExactDuplicate =
        lastAssistantMessage &&
        lastAssistantMessage.trim() === cannedResponse.response.trim();

      const lastWasGeneric =
        lastAssistantMessage && isGenericResponse(lastAssistantMessage);
      const currentIsGeneric = isGenericResponse(cannedResponse.response);

      if (
        isExactDuplicate ||
        (isFollowUpQuestion && lastWasGeneric && currentIsGeneric)
      ) {
        console.log(
          `⚠️ Pre-configured response matched but ${
            isExactDuplicate
              ? "same as last response"
              : "follow-up question with generic response"
          } - skipping to use OpenAI for better answer. Last: "${lastAssistantMessage?.substring(
            0,
            50
          )}...", Would return: "${cannedResponse.response.substring(
            0,
            50
          )}..."`
        );
        // Skip pre-configured response, continue to OpenAI
      } else {
        console.log(
          `✅ Pre-configured response matched for bot ${
            botRecord.id
          }: pattern matched message "${message.substring(0, 50)}..."`
        );

        // Stream pre-configured response for UX consistency (simulated streaming like cached responses)
        if (onDelta) {
          await streamCachedResponse(cannedResponse.response, onDelta);
        }

        logResponseSource({
          source: "canned",
          botId: botRecord.id,
          teamId,
          userId,
          note: "preconfigured response",
        });

        // Return immediately - no LLM call, no retrieval, no quota check
        // Still save to conversation history for continuity
        let conversationId: string | undefined;
        if (!input.private_mode) {
          conversationId = await saveChat({
            botId: botRecord.id,
            userId,
            teamId: teamId,
            message,
            response: cannedResponse.response,
            conversationId: conversation_id,
            ipAddress: ip,
            useAdminClient: shouldUseAdminClient,
            supabaseClient: shouldUseAdminClient ? undefined : supabase,
            plan: planId,
            skipQuotaCheck: true, // Don't count pre-configured responses against quota
          });
        }

        const actionResult = await applyCannedResponseAction({
          action: cannedResponse.action,
          actionConfig: cannedResponse.actionConfig,
          conversationId,
          source,
          supabase: shouldUseAdminClient ? createAdminClient() : supabase,
        });

        return {
          response: cannedResponse.response,
          conversationId,
          input: message,
          lineQuickReplies: actionResult.lineQuickReplies,
        };
      }
    } else {
      console.log(
        `❌ No pre-configured response matched for bot ${
          botRecord.id
        }: message "${message.substring(0, 50)}..."`
      );
    }
  } catch (error) {
    // If pre-configured response check fails, log and continue with normal flow
    console.error("Error checking pre-configured responses:", error);
    // Don't throw - continue with normal LLM flow
  }

  // Check response cache (after pre-configured responses, before quota check)
  // This provides cached responses for similar questions without calling OpenAI
  let cachedResponse: { response: string; similarity: number } | null = null;
  if (teamId && botRecord.id) {
    try {
      const systemPromptHash = hashSystemPrompt(botRecord.system_prompt);
      const cacheClient = shouldUseAdminClient ? createAdminClient() : supabase;

      const cached = await checkResponseCache({
        message,
        botId: botRecord.id,
        teamId,
        systemPromptHash,
        supabase: cacheClient,
      });

      if (cached) {
        // Only use cached response if similarity is very high (prioritize accuracy)
        // Exact matches (similarity = 1.0) are always safe
        // For similarity matches, require very high confidence (0.98+)
        if (cached.similarity >= 0.98 || cached.similarity === 1.0) {
          // Skip cached response if:
          // 1. It's the same as the last response (exact duplicate)
          // 2. It's a follow-up question AND the last response was generic
          const isExactDuplicate =
            lastAssistantMessage &&
            lastAssistantMessage.trim() === cached.response.trim();

          const lastWasGeneric =
            lastAssistantMessage && isGenericResponse(lastAssistantMessage);
          const currentIsGeneric = isGenericResponse(cached.response);

          if (
            isExactDuplicate ||
            (isFollowUpQuestion && lastWasGeneric && currentIsGeneric)
          ) {
            console.log(
              `⚠️ Cache hit but ${
                isExactDuplicate
                  ? "same as last response"
                  : "follow-up question with generic response"
              } - skipping to use OpenAI for better answer. Last: "${lastAssistantMessage?.substring(
                0,
                50
              )}...", Would return: "${cached.response.substring(0, 50)}..."`
            );
            // Skip cached response, continue to OpenAI
          } else {
            console.log(
              `✅ Cache hit for bot ${
                botRecord.id
              } (similarity: ${cached.similarity.toFixed(3)}, hits: ${
                cached.hit_count
              })`
            );

            // Stream cached response for UX consistency
            if (onDelta) {
              await streamCachedResponse(cached.response, onDelta);
            }

            logResponseSource({
              source: "cache",
              botId: botRecord.id,
              teamId,
              userId,
              note: `similarity:${cached.similarity.toFixed(3)}`,
            });

            // Save to conversation history if not private mode
            let conversationId: string | undefined;
            if (!input.private_mode) {
              conversationId = await saveChat({
                botId: botRecord.id,
                userId,
                teamId: teamId,
                message,
                response: cached.response,
                conversationId: conversation_id,
                ipAddress: ip,
                useAdminClient: shouldUseAdminClient,
                supabaseClient: shouldUseAdminClient ? undefined : supabase,
                plan: planId,
                skipQuotaCheck: true, // Cached responses don't count against quota
              });
            }

            return {
              response: cached.response,
              conversationId,
              input: message,
            };
          }
        } else {
          console.log(
            `⚠️ Cache match found but similarity (${cached.similarity.toFixed(
              3
            )}) below threshold (0.98), skipping for accuracy - will use OpenAI for accurate answer`
          );
          // Don't use cached response - let it fall through to OpenAI for accurate answer
        }
      } else {
        console.log(
          `❌ Cache miss for bot ${botRecord.id} - will use OpenAI for accurate answer`
        );
      }
    } catch (error) {
      // If cache check fails, log and continue with normal flow (graceful degradation)
      console.error("Error checking response cache:", error);
      // Don't throw - continue with normal LLM flow
    }
  }

  let conversationHistory: Message[] = [];

  if (conversation_id) {
    const historyClient = shouldUseAdminClient ? createAdminClient() : supabase;
    conversationHistory = await fetchConversationHistory({
      client: historyClient,
      conversationId: conversation_id,
      limit: MAX_HISTORY_MESSAGES,
    });
    // History loaded from Supabase (enable logging here if debugging context issues)
  } else if (Array.isArray(providedHistory) && providedHistory.length > 0) {
    conversationHistory = providedHistory.slice(-MAX_HISTORY_MESSAGES);
  }

  // Validate content with moderation middleware
  // This happens after we resolve bot/team context so we can log properly
  try {
    await validateContent(message, {
      userId,
      teamId,
      botId,
      ipAddress: ip,
      userAgent,
    });
  } catch (error) {
    // validateContent throws ModerationError if flagged
    // Re-throw it so the API route can handle it with standardized error responses
    throw error;
  }

  const basePrompt = [
    {
      role: "system",
      content: `The knowledge that you provide is your own. Make no mention about the source of your knowledge in your responses. Do not refer to documents, embeddings, provided information etc. just answer the question based on your knowledge.`,
    },
    {
      role: "system",
      content: botRecord.rich_responses_enabled
        ? "Respond in concise Markdown when it improves clarity. Use short bullet lists or fenced code blocks sparingly. Avoid HTML."
        : "Respond in plain text only. Do not use Markdown, code fences, or bullet lists.",
    },
  ];

  const basePromptTokens = basePrompt.reduce(
    (sum, msg) => sum + countTokens(msg.content),
    0
  );
  const messageTokens = countTokens(message);
  const systemPromptTokens = countTokens(botSystemPrompt);
  const maxTokens = MODEL_MAX_TOKENS - TOKEN_BUFFER;
  const availableHistoryTokens = Math.max(
    0,
    maxTokens - (basePromptTokens + messageTokens + systemPromptTokens)
  );
  const { messages: trimmedHistory, tokenCount: historyTokenCount } =
    trimHistoryToFitTokenLimit(conversationHistory, availableHistoryTokens);

  const baseTokenCount =
    basePromptTokens + historyTokenCount + messageTokens + systemPromptTokens;

  let tokenBudget = maxTokens - baseTokenCount;

  const contextMessages: { role: "system"; content: string }[] = [];

  const llmEnabled = botRecord.llm_enabled !== false;

  if (teamId && llmEnabled) {
    try {
      // Use admin client for API key requests to bypass RLS
      const retrievalClient = shouldUseAdminClient
        ? createAdminClient()
        : supabase;
      const retrieval = await retrieveRelevantChunks({
        supabase: retrievalClient,
        teamId,
        botId: botRecord.id,
        query: message,
        conversationId: conversation_id ?? undefined,
      });

      const chunks = retrieval.chunks;
      console.log(
        `Retrieved ${chunks.length} chunks for bot ${botRecord.id} (teamId: ${teamId}, usingAdminClient: ${shouldUseAdminClient})`
      );

      if (chunks.length === 0) {
        console.warn(
          `No chunks retrieved for bot ${botRecord.id}. This may indicate:`
        );
        console.warn(
          `  - Documents are not embedded yet (check embedding_jobs table)`
        );
        console.warn(`  - No documents are linked to this bot`);
        console.warn(
          `  - RLS is blocking access (usingAdminClient: ${shouldUseAdminClient})`
        );
      }

      let sourceIndex = 1;
      const usedChunkMeta: Array<{ id: string; language: string | null }> = [];

      for (const chunk of chunks) {
        // Include chunk content directly without "Doc X" headers
        // This prevents the AI from referencing "documentation" or "documents"
        const content = chunk.content;
        const tokenCost = countTokens(content);
        if (tokenCost > tokenBudget) {
          continue;
        }
        contextMessages.push({ role: "system", content });
        usedChunkMeta.push({
          id: chunk.chunkId,
          language: chunk.language ?? chunk.documentLanguage ?? null,
        });
        tokenBudget -= tokenCost;
        sourceIndex += 1;
      }

      console.log(
        `Added ${contextMessages.length} context messages from ${chunks.length} chunks`
      );
      console.log("[retrieval:language] sent_to_llm", {
        chunkIds: usedChunkMeta.map((chunk) => chunk.id),
        languages: usedChunkMeta.map((chunk) => chunk.language ?? "unknown"),
      });
    } catch (error) {
      console.error("Retrieval helper failed", error);
      console.error("Retrieval error details:", {
        teamId,
        botId: botRecord.id,
        usingAdminClient: shouldUseAdminClient,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else if (teamId && !llmEnabled) {
    console.log(
      "Skipping embedding retrieval because LLM is disabled for this bot."
    );
  } else {
    console.log(
      "Skipping retrieval because teamId is missing (likely public request)."
    );
  }

  // Check quota BEFORE calling OpenAI API
  // ALL OpenAI API calls should count against the bot owner's quota
  // This includes: authenticated requests, API key requests, AND public requests
  // Public requests cost money too, so they must count against quota
  // Pre-configured responses already returned early above, so they don't count here
  // Note: We track OpenAI API calls (not saved messages), so delta is 1 per API call
  if (teamId) {
    try {
      // Check quota for ALL requests that will call OpenAI API
      // Public requests count against the bot owner's team quota (they cost money!)
      await ensureQuotaAllows(
        teamId,
        planId,
        "messagesMonthly",
        1,
        teamCreatedAt
      );
    } catch (error) {
      // Check for a custom pre-configured response for quota exceeded
      // This allows bot owners to customize the message shown to users
      // We check for ALL quota exceeded errors (both public and internal)
      // so the homepage demo bot can show friendly messages too
      if (error instanceof QuotaExceededError) {
        // Check for a pre-configured response with pattern "quota_exceeded"
        const quotaExceededResponse = await checkCannedResponses({
          message: "quota_exceeded", // Special pattern for quota exceeded
          botId: botRecord.id,
          teamId,
          supabase: shouldUseAdminClient ? createAdminClient() : supabase,
        });

        if (quotaExceededResponse?.matched && quotaExceededResponse.response) {
          // Return the custom pre-configured response instead of throwing an error
          // This provides a friendly message to all users (public and internal)
          logResponseSource({
            source: "canned",
            botId: botRecord.id,
            teamId,
            userId,
            note: "quota exceeded preconfigured",
          });

          let conversationId: string | undefined;
          if (!input.private_mode) {
            conversationId = await saveChat({
              botId: botRecord.id,
              userId,
              teamId: teamId,
              message,
              response: quotaExceededResponse.response,
              conversationId: conversation_id,
              ipAddress: ip,
              useAdminClient: shouldUseAdminClient,
              supabaseClient: shouldUseAdminClient ? undefined : supabase,
              plan: planId,
              skipQuotaCheck: true, // Don't count quota-exceeded responses against quota
            });
          }

          return {
            response: quotaExceededResponse.response,
            conversationId,
            input: message,
          };
        }

        // If no custom pre-configured response found:
        // - For public users, show generic "service unavailable" message
        // - For internal/authenticated users, show technical quota error
        const period = getPlanPeriod(planId, teamCreatedAt);
        const resetText = period.end
          ? new Date(period.end).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })
          : "soon";
        const friendlyMessage = `You've reached your monthly AI message limit. Your usage will reset on ${resetText}, or you can upgrade your plan to continue immediately.`;
        // For public users, return friendly message
        if (isPublicRequest) {
          return {
            response: friendlyMessage,
            conversationId: undefined,
            input: message,
          };
        }
        // For authenticated users, throw with friendly context
        throw new Error(friendlyMessage);
      }
      // For other errors, re-throw as-is
      throw error;
    }
  }

  const systemPromptSegment = botSystemPrompt
    ? [{ role: "system", content: botSystemPrompt }]
    : [];

  const fullPrompt = [
    ...basePrompt,
    ...contextMessages,
    ...systemPromptSegment,
    ...trimmedHistory,
    { role: "user", content: message },
  ];

  // Check if free tier has expired (after pre-configured responses and cache checks)
  // This allows pre-configured responses to continue working while blocking LLM calls
  if (planId === "free" && teamCreatedAt) {
    if (isFreeTierExpired(teamCreatedAt, teamTrialEndsAt)) {
      try {
        const deterministicResponse = await tryDeterministicFallback({
          supabase,
          teamId,
          botId: botRecord.id,
          query: message,
          useAdminClient: shouldUseAdminClient,
          allowReadMore: Boolean(botRecord.rich_responses_enabled),
        });

        if (deterministicResponse) {
          logResponseSource({
            source: "deterministic",
            botId: botRecord.id,
            teamId,
            userId,
            note: "free_tier_expired",
          });

          let conversationId: string | undefined;
          if (!input.private_mode) {
            conversationId = await saveChat({
              botId: botRecord.id,
              userId,
              teamId: teamId,
              message,
              response: deterministicResponse,
              conversationId: conversation_id,
              ipAddress: ip,
              useAdminClient: shouldUseAdminClient,
              supabaseClient: shouldUseAdminClient ? undefined : supabase,
              plan: planId,
              skipQuotaCheck: true,
            });
          }
          if (onDelta) {
            await streamCachedResponse(deterministicResponse, onDelta);
          }
          return {
            response: deterministicResponse,
            conversationId,
            input: message,
          };
        }

        // Try to use a fallback: first check special system_unavailable pre-configured response,
        // then check bot's default_response field
        const fallbackResponse = await checkCannedResponses({
          message: "system_unavailable",
          botId: botRecord.id,
          teamId,
          supabase: shouldUseAdminClient ? createAdminClient() : supabase,
        });

        if (fallbackResponse?.matched && fallbackResponse.response) {
          logResponseSource({
            source: "canned",
            botId: botRecord.id,
            teamId,
            userId,
            note: "openai error fallback",
          });

          let conversationId: string | undefined;
          if (!input.private_mode) {
            conversationId = await saveChat({
              botId: botRecord.id,
              userId,
              teamId: teamId,
              message,
              response: fallbackResponse.response,
              conversationId: conversation_id,
              ipAddress: ip,
              useAdminClient: shouldUseAdminClient,
              supabaseClient: shouldUseAdminClient ? undefined : supabase,
              plan: planId,
              skipQuotaCheck: true,
            });
          }
          if (onDelta) {
            await streamCachedResponse(fallbackResponse.response, onDelta);
          }
          return {
            response: fallbackResponse.response,
            conversationId,
            input: message,
          };
        }

        // If no system_unavailable pre-configured response, check bot's default_response
        if (botRecord.default_response) {
          let conversationId: string | undefined;
          if (!input.private_mode) {
            conversationId = await saveChat({
              botId: botRecord.id,
              userId,
              teamId: teamId,
              message,
              response: botRecord.default_response,
              conversationId: conversation_id,
              ipAddress: ip,
              useAdminClient: shouldUseAdminClient,
              supabaseClient: shouldUseAdminClient ? undefined : supabase,
              plan: planId,
              skipQuotaCheck: true, // Don't count default responses against quota
            });
          }

          if (onDelta) {
            await streamCachedResponse(botRecord.default_response, onDelta);
          }

          return {
            response: botRecord.default_response,
            conversationId,
            input: message,
          };
        }
      } catch (fallbackError) {
        console.error(
          "Error checking fallback response for expired free tier:",
          fallbackError
        );
      }

      // If no fallback response found, throw error with upgrade prompt
      const daysRemaining = getFreeTierDaysRemaining(
        teamCreatedAt,
        teamTrialEndsAt
      );
      const error = new Error(
        "Your evaluation period has ended. Upgrade to Pro or Team to continue using AI-powered responses. " +
          "Simple responses (pre-configured responses) will continue to work."
      );
      error.name = "FreeTierExpiredError";
      (error as any).code = "FREE_TIER_EXPIRED";
      (error as any).daysRemaining = daysRemaining;
      throw error;
    }
  }

  // Check if LLM is disabled for this bot (after pre-configured responses and cache checks)
  // This allows pre-configured responses and cache to continue working while blocking LLM calls
  if (botRecord.llm_enabled === false) {
    // Determine if this is a public embed request
    const isPublicEmbed =
      isPublicRequest || (botRecord.is_public && !isInternal);

    // Generic default response for public embeds
    const genericDefaultResponse =
      "I'm currently unable to process complex questions. Please try again later.";

    const deterministicResponse = await tryDeterministicFallback({
      supabase,
      teamId,
      botId: botRecord.id,
      query: message,
      useAdminClient: shouldUseAdminClient,
      allowReadMore: Boolean(botRecord.rich_responses_enabled),
    });

    if (deterministicResponse) {
      logResponseSource({
        source: "deterministic",
        botId: botRecord.id,
        teamId,
        userId,
        note: "llm_disabled",
      });

      let conversationId: string | undefined;
      if (!input.private_mode) {
        conversationId = await saveChat({
          botId: botRecord.id,
          userId,
          teamId: teamId,
          message,
          response: deterministicResponse,
          conversationId: conversation_id,
          ipAddress: ip,
          useAdminClient: shouldUseAdminClient,
          supabaseClient: shouldUseAdminClient ? undefined : supabase,
          plan: planId,
          skipQuotaCheck: true,
        });
      }

      if (onDelta) {
        await streamCachedResponse(deterministicResponse, onDelta);
      }

      return {
        response: deterministicResponse,
        conversationId,
        input: message,
      };
    }

    // For public embeds: use bot's default_response or generic fallback
    // For internal (Tune/my bots/chat): use bot's default_response or throw error
    let fallbackResponse: string | null = null;

    if (botRecord.default_response) {
      fallbackResponse = botRecord.default_response;
    } else if (isPublicEmbed) {
      fallbackResponse = genericDefaultResponse;
    }

    if (fallbackResponse) {
      logResponseSource({
        source: "canned",
        botId: botRecord.id,
        teamId,
        userId,
        note: "llm_disabled",
      });

      let conversationId: string | undefined;
      if (!input.private_mode) {
        conversationId = await saveChat({
          botId: botRecord.id,
          userId,
          teamId: teamId,
          message,
          response: fallbackResponse,
          conversationId: conversation_id,
          ipAddress: ip,
          useAdminClient: shouldUseAdminClient,
          supabaseClient: shouldUseAdminClient ? undefined : supabase,
          plan: planId,
          skipQuotaCheck: true, // Don't count default responses against quota
        });
      }

      if (onDelta) {
        await streamCachedResponse(fallbackResponse, onDelta);
      }

      return {
        response: fallbackResponse,
        conversationId,
        input: message,
      };
    } else {
      // Internal request without default_response - throw error
      const error = new Error(
        "AI responses are disabled for this bot. Please enable LLM in bot settings or set a default response."
      );
      error.name = "LLMDisabledError";
      (error as any).code = "LLM_DISABLED";
      throw error;
    }
  }

  console.log("Prompt sent to OpenAI:", JSON.stringify(fullPrompt));

  // Select model based on plan and request type
  const selectedModel = selectModelForPlan(planId, isPublicRequest);

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: fullPrompt,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("OpenAI API error:", res.status, errorText);

      // Try to use a fallback pre-configured response for service unavailability
      try {
        const fallbackResponse = await checkCannedResponses({
          message: "system_unavailable",
          botId: botRecord.id,
          teamId,
          supabase: shouldUseAdminClient ? createAdminClient() : supabase,
        });

        if (fallbackResponse?.matched && fallbackResponse.response) {
          let conversationId: string | undefined;
          if (!input.private_mode) {
            conversationId = await saveChat({
              botId: botRecord.id,
              userId,
              teamId: teamId,
              message,
              response: fallbackResponse.response,
              conversationId: conversation_id,
              ipAddress: ip,
              useAdminClient: shouldUseAdminClient,
              supabaseClient: shouldUseAdminClient ? undefined : supabase,
              plan: planId,
              skipQuotaCheck: true,
            });
          }
          return {
            response: fallbackResponse.response,
            conversationId,
          };
        }
      } catch (fallbackError) {
        console.error(
          "Error checking fallback pre-configured response:",
          fallbackError
        );
      }

      // If no fallback response, throw the original error
      throw new Error(`OpenAI API error: ${res.status} ${errorText}`);
    }

    if (!res.body) {
      throw new Error("OpenAI API error: No response body");
    }
  } catch (error) {
    // Handle network errors, timeouts, etc.
    if (error instanceof Error && error.message.includes("OpenAI API error")) {
      throw error; // Re-throw OpenAI API errors
    }

    console.error("Network or API error:", error);

    // Try to use a fallback: first check special system_unavailable pre-configured response,
    // then check bot's default_response field
    try {
      const fallbackResponse = await checkCannedResponses({
        message: "system_unavailable",
        botId: botRecord.id,
        teamId,
        supabase: shouldUseAdminClient ? createAdminClient() : supabase,
      });

      if (fallbackResponse?.matched && fallbackResponse.response) {
        logResponseSource({
          source: "canned",
          botId: botRecord.id,
          teamId,
          userId,
          note: "network/error fallback",
        });

        let conversationId: string | undefined;
        if (!input.private_mode) {
          conversationId = await saveChat({
            botId: botRecord.id,
            userId,
            teamId: teamId,
            message,
            response: fallbackResponse.response,
            conversationId: conversation_id,
            ipAddress: ip,
            useAdminClient: shouldUseAdminClient,
            supabaseClient: shouldUseAdminClient ? undefined : supabase,
            plan: planId,
            skipQuotaCheck: true,
          });
        }
        logResponseSource({
          source: "canned",
          botId: botRecord.id,
          teamId,
          userId,
          note: "free tier expired fallback",
        });
        if (onDelta) {
          await streamCachedResponse(fallbackResponse.response, onDelta);
        }
        return {
          response: fallbackResponse.response,
          conversationId,
          input: message,
        };
      }

      const deterministicResponse = await tryDeterministicFallback({
        supabase,
        teamId,
        botId: botRecord.id,
        query: message,
        useAdminClient: shouldUseAdminClient,
        allowReadMore: Boolean(botRecord.rich_responses_enabled),
      });

      if (deterministicResponse) {
        logResponseSource({
          source: "deterministic",
          botId: botRecord.id,
          teamId,
          userId,
          note: "network/error fallback",
        });

        let conversationId: string | undefined;
        if (!input.private_mode) {
          conversationId = await saveChat({
            botId: botRecord.id,
            userId,
            teamId: teamId,
            message,
            response: deterministicResponse,
            conversationId: conversation_id,
            ipAddress: ip,
            useAdminClient: shouldUseAdminClient,
            supabaseClient: shouldUseAdminClient ? undefined : supabase,
            plan: planId,
            skipQuotaCheck: true,
          });
        }

        if (onDelta) {
          await streamCachedResponse(deterministicResponse, onDelta);
        }

        return {
          response: deterministicResponse,
          conversationId,
          input: message,
        };
      }

      // If no system_unavailable pre-configured response, check bot's default_response
      if (botRecord.default_response) {
        logResponseSource({
          source: "canned",
          botId: botRecord.id,
          teamId,
          userId,
          note: "network/error default response",
        });

        let conversationId: string | undefined;
        if (!input.private_mode) {
          conversationId = await saveChat({
            botId: botRecord.id,
            userId,
            teamId: teamId,
            message,
            response: botRecord.default_response,
            conversationId: conversation_id,
            ipAddress: ip,
            useAdminClient: shouldUseAdminClient,
            supabaseClient: shouldUseAdminClient ? undefined : supabase,
            plan: planId,
            skipQuotaCheck: true,
          });
        }
        logResponseSource({
          source: "canned",
          botId: botRecord.id,
          teamId,
          userId,
          note: "free tier expired default response",
        });
        if (onDelta) {
          await streamCachedResponse(botRecord.default_response, onDelta);
        }
        return {
          response: botRecord.default_response,
          conversationId,
          input: message,
        };
      }
    } catch (fallbackError) {
      console.error("Error checking fallback response:", fallbackError);
    }

    // If no fallback response, throw a friendly error
    throw new Error(
      "Service temporarily unavailable. Please try again in a moment."
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";
  let buffer = "";

  const processEvent = async (event: string) => {
    const lines = event
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;

      const payload = line.slice("data:".length).trim();
      if (!payload) continue;

      if (payload === "[DONE]") {
        return true;
      }

      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          if (onDelta) await onDelta(delta);
          console.log("📥 Chunk received:", delta); // ✅ streaming log
        }
      } catch (err) {
        console.error("Error parsing stream chunk", err, { payload });
      }
    }

    return false;
  };

  let doneReading = false;
  while (!doneReading) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), {
      stream: !done,
    });

    let separatorIndex: number;
    while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
      const event = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      const shouldStop = await processEvent(event);
      if (shouldStop) {
        doneReading = true;
        break;
      }
    }

    if (done) {
      if (buffer.trim().length > 0) {
        await processEvent(buffer);
      }
      doneReading = true;
    }
  }

  // Estimate token counts for cost tracking
  // Note: Streaming responses don't include token counts, so we estimate
  const estimatedInputTokens = countTokens(
    JSON.stringify([
      ...basePrompt,
      ...trimmedHistory,
      { role: "user", content: message },
    ])
  );
  const estimatedOutputTokens = countTokens(fullText);
  const estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens;

  // Increment OpenAI API call counter (tracks actual API usage, not saved messages)
  // This works for both private and non-private mode conversations
  if (teamId) {
    try {
      await incrementOpenAiApiCallCount(teamId, planId, teamCreatedAt);
    } catch (error) {
      // Log error but don't fail the request - quota tracking is important but shouldn't break the flow
      console.error("Failed to increment OpenAI API call count:", error);
    }
  }

  // Log cost tracking (async, fire-and-forget)
  if (teamId && selectedModel) {
    // Calculate cost using database pricing (with fallback)
    const cost = await calculateCost(
      selectedModel,
      estimatedInputTokens,
      estimatedOutputTokens,
      shouldUseAdminClient ? createAdminClient() : supabase
    );

    logCostTrackingAsync({
      team_id: teamId,
      bot_id: botRecord.id || undefined,
      user_id: userId || undefined,
      cost_type: "chat",
      model: selectedModel,
      input_tokens: estimatedInputTokens,
      output_tokens: estimatedOutputTokens,
      total_tokens: estimatedTotalTokens,
      cost_usd: cost,
      cache_hit: false,
      ip_address: ip || undefined,
      metadata: {
        conversation_id: conversation_id,
        message_preview: message.substring(0, 100),
        response_length: fullText.length,
      },
    });
  }

  // Save response to cache (after successful OpenAI API call)
  // This enables future similar questions to use cached responses
  if (teamId && botRecord.id && fullText) {
    try {
      const systemPromptHash = hashSystemPrompt(botRecord.system_prompt);
      const cacheClient = shouldUseAdminClient ? createAdminClient() : supabase;

      await saveResponseToCache({
        message,
        response: fullText,
        botId: botRecord.id,
        teamId,
        systemPromptHash,
        supabase: cacheClient,
      });

      console.log(`💾 Saved response to cache for bot ${botRecord.id}`);
    } catch (error) {
      // Log error but don't fail the request - cache saving is non-critical
      console.error("Failed to save response to cache:", error);
    }
  }

  // Skip saving to database if private_mode is enabled
  let conversationId: string | undefined;
  if (!input.private_mode) {
    conversationId = await saveChat({
      botId: botRecord.id,
      userId,
      teamId: teamId, // Pass teamId explicitly when using API key
      message,
      response: fullText || "No response",
      conversationId: conversation_id,
      ipAddress: ip,
      useAdminClient: shouldUseAdminClient, // Use admin client for API key or unauthenticated requests
      supabaseClient: shouldUseAdminClient ? undefined : supabase,
      plan: planId,
      skipQuotaCheck: true, // Quota is already checked and incremented above
    });
  }

  logResponseSource({
    source: "llm",
    botId: botRecord.id,
    teamId,
    userId,
    note: `model:${selectedModel}`,
  });

  return {
    response: fullText || "No response",
    conversationId,
    input: message,
  };
}
