// src/lib/middleware/moderation.ts
// OpenAI Moderation API middleware for content filtering
// Screens user input before sending to OpenAI chat/completions endpoint

import { env } from "@/lib/env";
import type Stripe from "stripe";
import { AUDIT_ACTION, AUDIT_RESOURCE, type AuditResourceType } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";

/**
 * Moderation categories returned by OpenAI Moderation API
 * @see https://platform.openai.com/docs/guides/moderation/overview
 */
export type ModerationCategory =
  | "hate"
  | "hate/threatening"
  | "harassment"
  | "harassment/threatening"
  | "self-harm"
  | "self-harm/intent"
  | "self-harm/instructions"
  | "sexual"
  | "sexual/minors"
  | "violence"
  | "violence/graphic";

/**
 * Detailed moderation result from OpenAI
 */
export interface ModerationResult {
  flagged: boolean;
  categories: Record<ModerationCategory, boolean>;
  categoryScores: Record<ModerationCategory, number>;
}

/**
 * Options for logging moderation flags
 */
export interface LogModerationOptions {
  userId?: string;
  teamId?: string;
  botId?: string;
  ipAddress?: string;
  userAgent?: string;
  message: string;
  moderationResult: ModerationResult;
}

/**
 * Standardized error response for moderation failures
 */
export interface ModerationError {
  code: "MODERATION_FLAGGED";
  message: string;
  flaggedCategories: ModerationCategory[];
}

/**
 * Checks content against OpenAI Moderation API
 * @param input - The content to moderate
 * @returns Detailed moderation result with categories and scores
 */
export async function moderateContent(
  input: string
): Promise<ModerationResult> {
  const emptyResult = {
    flagged: false,
    categories: {} as Record<ModerationCategory, boolean>,
    categoryScores: {} as Record<ModerationCategory, number>,
  };
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ input }),
      });

      if (response.status === 429 && attempt < maxAttempts) {
        const delayMs = 1000 * attempt;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Moderation API error:", response.status, errorText);
        return emptyResult;
      }

      const data = await response.json();
      const result = data?.results?.[0];

      if (!result) {
        throw new Error("Invalid moderation API response");
      }

      return {
        flagged: result.flagged === true,
        categories: result.categories || {},
        categoryScores: result.category_scores || {},
      };
    } catch (error) {
      console.error("Error calling moderation API:", error);
      if (attempt < maxAttempts) {
        const delayMs = 1000 * attempt;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      // Fail open: if moderation fails, log but allow content through
      return emptyResult;
    }
  }

  return emptyResult;
}

/**
 * Gets the list of flagged categories from a moderation result
 */
export function getFlaggedCategories(
  result: ModerationResult
): ModerationCategory[] {
  return Object.entries(result.categories)
    .filter(([, flagged]) => flagged === true)
    .map(([category]) => category as ModerationCategory);
}

/**
 * Logs moderation flags to audit_log for review
 * Uses admin client to ensure logging works even without authenticated session
 */
export async function logModerationFlag(
  options: LogModerationOptions,
  resourceType: AuditResourceType = AUDIT_RESOURCE.CONVERSATION
): Promise<void> {
  try {
    const flaggedCategories = getFlaggedCategories(options.moderationResult);

    await logAuditEvent({
      teamId: options.teamId,
      userId: options.userId,
      action: AUDIT_ACTION.MODERATION_FLAGGED,
      resourceType: resourceType,
      resourceId: options.botId || null,
      metadata: {
        message_preview: options.message.substring(0, 200),
        message_length: options.message.length,
        flagged_categories: flaggedCategories,
        category_scores: options.moderationResult.categoryScores,
        bot_id: options.botId || null,
      },
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    });

    const { logger } = await import("@/lib/logger");
    logger.warn(`Moderation flag logged: ${flaggedCategories.join(", ")}`, {
      flaggedCategories,
      botId: options.botId,
      teamId: options.teamId,
      messageLength: options.message.length,
    });
  } catch (error) {
    const { logger } = await import("@/lib/logger");
    logger.error("Error logging moderation flag", error, {
      botId: options.botId,
      teamId: options.teamId,
    });
    // Don't throw - logging failures shouldn't break the request
  }
}

/**
 * Validates content against moderation API and logs if flagged
 * @param input - Content to validate
 * @param options - Logging options
 * @returns Moderation result or throws ModerationError if flagged
 */
export async function validateContent(
  input: string,
  options?: Omit<LogModerationOptions, "message" | "moderationResult">
): Promise<void> {
  const result = await moderateContent(input);

  if (result.flagged) {
    const flaggedCategories = getFlaggedCategories(result);

    // Log the flagged content for review
    if (options) {
      await logModerationFlag({
        ...options,
        message: input,
        moderationResult: result,
      });
    }

    // Throw standardized error
    const error: ModerationError = {
      code: "MODERATION_FLAGGED",
      message:
        "Your message was flagged by our content moderation system. Please revise your message and try again.",
      flaggedCategories,
    };

    throw error;
  }
}

/**
 * Checks document content for moderation flags without throwing.
 * Used for documents where we want to flag but still allow creation.
 * @param input - Document content to check
 * @param options - Logging options
 * @returns true if content is flagged, false otherwise
 */
export async function checkDocumentContent(
  input: string,
  options?: Omit<LogModerationOptions, "message" | "moderationResult">
): Promise<boolean> {
  const result = await moderateContent(input);

  if (result.flagged) {
    const flaggedCategories = getFlaggedCategories(result);

    // Log the flagged content for review (use DOCUMENT resource type)
    if (options) {
      await logModerationFlag(
        {
          ...options,
          message: input.substring(0, 1000), // Log first 1000 chars for documents
          moderationResult: result,
        },
        AUDIT_RESOURCE.DOCUMENT
      );
    }

    return true;
  }

  return false;
}
