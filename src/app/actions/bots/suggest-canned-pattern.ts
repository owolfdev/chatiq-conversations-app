// src/app/actions/bots/suggest-canned-pattern.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { getTeamPlan } from "@/lib/teams/usage";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { RateLimitExceededError } from "@/lib/errors/rate-limit";
import { validateContent } from "@/lib/middleware/moderation";
import type { PlanId } from "@/lib/plans/quotas";

type PatternType = "regex" | "keyword" | "exact";
const MAX_INTENT_LENGTH = 500;
const DAILY_SUGGEST_LIMIT = 50; // per team per day for pattern helper

export async function suggestCannedPattern(input: {
  intent: string;
  preferredType?: PatternType;
}) {
  const intent = input.intent?.trim();
  if (!intent) {
    return { success: false, error: "Please describe the user intent." };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      success: false,
      error: "OpenAI is not configured. Add OPENAI_API_KEY to use suggestions.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    return {
      success: false,
      error: "No team found. Please contact support.",
    };
  }

  // Clamp intent length to avoid prompt abuse
  const safeIntent =
    intent.length > MAX_INTENT_LENGTH
      ? intent.slice(0, MAX_INTENT_LENGTH)
      : intent;

  // Moderate the intent to avoid passing abusive content downstream
  try {
    await validateContent(safeIntent, {
      userId: user.id,
      teamId,
    });
  } catch (error) {
    const message =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as any).message === "string"
        ? (error as any).message
        : "Content not allowed. Please revise and try again.";
    return { success: false, error: message };
  }

  // Rate limit per team for this helper
  let plan: PlanId = "free";
  try {
    plan = await getTeamPlan(teamId);
  } catch {
    plan = "free";
  }
  try {
    await enforceRateLimit({
      teamId,
      plan,
      overrideLimit: DAILY_SUGGEST_LIMIT,
      context: {
        actorType: "user",
        actorId: user.id,
        route: "canned_pattern_helper",
        source: "dashboard",
      },
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return {
        success: false,
        error:
          "Pattern helper limit reached for today. Please try again tomorrow.",
      };
    }
    console.error("Pattern helper rate limit error", error);
    return {
      success: false,
      error: "Unable to generate a pattern right now. Please try again later.",
    };
  }

  const messages = [
    {
      role: "system",
      content:
        "You craft safe, concise patterns for matching chat inputs. You must respond with JSON containing: pattern (string), pattern_type (regex|keyword|exact), and explanation (short string). Prefer regex for anchored greetings or when punctuation/fillers matter; prefer keyword for simple OR lists; prefer exact when the string must match fully. Keep patterns narrow to avoid false positives: anchor greetings to start, add word boundaries, avoid greedy .* unless necessary, and strip trailing/leading spaces. Patterns should not include delimiters like forward slashes.",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          intent: safeIntent,
          preferredType: input.preferredType ?? null,
          examples: [
            {
              intent: "greetings like hi, hello, hey with punctuation",
              pattern: "^(hi|hello|hey)[!. ]*$",
              pattern_type: "regex",
            },
            {
              intent: "ask about pricing",
              pattern: "pricing|prices|cost|price",
              pattern_type: "keyword",
            },
            {
              intent: "exact code phrase",
              pattern: "reset password",
              pattern_type: "exact",
            },
          ],
        },
        null,
        2
      ),
    },
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.35,
        max_tokens: 200,
        messages,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      console.error("suggestCannedPattern failed", message);
      return { success: false, error: "Pattern suggestion failed. Try again." };
    }

    const completion = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return { success: false, error: "No suggestion returned. Try again." };
    }

    const parsed = JSON.parse(content) as {
      pattern?: string;
      pattern_type?: PatternType;
      explanation?: string;
    };

    if (!parsed.pattern || !parsed.pattern_type) {
      return {
        success: false,
        error: "Suggestion missing pattern. Try again.",
      };
    }

    if (!["regex", "keyword", "exact"].includes(parsed.pattern_type)) {
      return {
        success: false,
        error: "Invalid pattern type returned. Try again.",
      };
    }

    return {
      success: true,
      data: {
        pattern: parsed.pattern.trim(),
        pattern_type: parsed.pattern_type as PatternType,
        explanation: parsed.explanation?.trim(),
      },
    };
  } catch (error) {
    console.error("suggestCannedPattern error", error);
    return {
      success: false,
      error: "Pattern suggestion failed. Please try again.",
    };
  }
}
