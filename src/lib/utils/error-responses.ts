// src/lib/utils/error-responses.ts
// Standardized error response format for API routes

import { QuotaExceededError } from "@/lib/teams/usage";
import { RateLimitExceededError } from "@/lib/errors/rate-limit";

/**
 * Standard error response format
 */
export interface StandardErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Error codes used across the application
 */
export enum ErrorCode {
  // Validation errors
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_API_KEY = "INVALID_API_KEY",

  // Resource errors
  NOT_FOUND = "NOT_FOUND",
  BOT_NOT_FOUND = "BOT_NOT_FOUND",
  CONFLICT = "CONFLICT",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",

  // Rate limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Evaluation
  EVALUATION_EXPIRED = "EVALUATION_EXPIRED",

  // Moderation
  MODERATION_FLAGGED = "MODERATION_FLAGGED",

  // OpenAI API errors
  OPENAI_API_ERROR = "OPENAI_API_ERROR",
  MODERATION_API_ERROR = "MODERATION_API_ERROR",

  // Server errors
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}

/**
 * HTTP status codes mapped to error codes
 */
const ERROR_STATUS_MAP: Record<string, number> = {
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.BOT_NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.QUOTA_EXCEEDED]: 402,
  [ErrorCode.EVALUATION_EXPIRED]: 403,
  [ErrorCode.MODERATION_FLAGGED]: 422,
  [ErrorCode.OPENAI_API_ERROR]: 502,
  [ErrorCode.MODERATION_API_ERROR]: 502,
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.INVALID_API_KEY]: 401,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
};

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode | string,
  message: string,
  details?: Record<string, unknown>
): StandardErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/**
 * Gets the appropriate HTTP status code for an error code
 */
export function getErrorStatus(code: ErrorCode | string): number {
  return ERROR_STATUS_MAP[code] || 500;
}

/**
 * Converts an Error to a standardized error response
 * Handles known error types (ModerationError, etc.)
 */
export function errorToResponse(error: unknown): {
  response: StandardErrorResponse;
  status: number;
} {
  // Handle ModerationError
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "MODERATION_FLAGGED"
  ) {
    const moderationError = error as {
      code: string;
      message: string;
      flaggedCategories?: string[];
    };
    return {
      response: createErrorResponse(
        ErrorCode.MODERATION_FLAGGED,
        moderationError.message,
        {
          flaggedCategories: moderationError.flaggedCategories || [],
        }
      ),
      status: getErrorStatus(ErrorCode.MODERATION_FLAGGED),
    };
  }

  if (error instanceof QuotaExceededError) {
    return {
      response: createErrorResponse(ErrorCode.QUOTA_EXCEEDED, error.message, {
        resource: error.resource,
        limit: error.limit,
        used: error.used,
        remaining: error.remaining,
      }),
      status: getErrorStatus(ErrorCode.QUOTA_EXCEEDED),
    };
  }

  if (error instanceof RateLimitExceededError) {
    return {
      response: createErrorResponse(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        error.message,
        {
          limit: error.limit,
          usage: error.usage,
          plan: error.plan,
          teamId: error.teamId,
          increment: error.increment,
        }
      ),
      status: getErrorStatus(ErrorCode.RATE_LIMIT_EXCEEDED),
    };
  }

  // Handle standard Error
  if (error instanceof Error) {
    const message = error.message;

    // Check for specific error patterns
    if (message.includes("limit")) {
      return {
        response: createErrorResponse(ErrorCode.RATE_LIMIT_EXCEEDED, message),
        status: getErrorStatus(ErrorCode.RATE_LIMIT_EXCEEDED),
      };
    }

    if (message.includes("not found") || message.includes("Bot not found")) {
      return {
        response: createErrorResponse(ErrorCode.BOT_NOT_FOUND, message),
        status: getErrorStatus(ErrorCode.BOT_NOT_FOUND),
      };
    }

    if (
      message.includes("API key required") ||
      (error.name === "UnauthorizedError" && message.includes("API key"))
    ) {
      return {
        response: createErrorResponse(ErrorCode.UNAUTHORIZED, message),
        status: getErrorStatus(ErrorCode.UNAUTHORIZED),
      };
    }

    if (message.includes("Invalid API key") || message.includes("API key")) {
      return {
        response: createErrorResponse(ErrorCode.INVALID_API_KEY, message),
        status: getErrorStatus(ErrorCode.INVALID_API_KEY),
      };
    }

    if (message.includes("Moderation API")) {
      return {
        response: createErrorResponse(
          ErrorCode.MODERATION_API_ERROR,
          "Content moderation service temporarily unavailable"
        ),
        status: getErrorStatus(ErrorCode.MODERATION_API_ERROR),
      };
    }

    if (message.includes("OpenAI") || message.includes("stream error")) {
      return {
        response: createErrorResponse(
          ErrorCode.OPENAI_API_ERROR,
          "AI service temporarily unavailable"
        ),
        status: getErrorStatus(ErrorCode.OPENAI_API_ERROR),
      };
    }

    if (
      message.includes("temporarily unavailable") ||
      message.includes("unavailable")
    ) {
      return {
        response: createErrorResponse(ErrorCode.SERVICE_UNAVAILABLE, message),
        status: getErrorStatus(ErrorCode.SERVICE_UNAVAILABLE),
      };
    }

    if (
      (typeof (error as { code?: string }).code === "string" &&
        (error as { code?: string }).code === ErrorCode.EVALUATION_EXPIRED) ||
      message.includes("Evaluation period ended")
    ) {
      return {
        response: createErrorResponse(ErrorCode.EVALUATION_EXPIRED, message),
        status: getErrorStatus(ErrorCode.EVALUATION_EXPIRED),
      };
    }

    // Default error response
    return {
      response: createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, message),
      status: getErrorStatus(ErrorCode.INTERNAL_SERVER_ERROR),
    };
  }

  // Unknown error type
  return {
    response: createErrorResponse(
      ErrorCode.INTERNAL_SERVER_ERROR,
      "An unexpected error occurred"
    ),
    status: getErrorStatus(ErrorCode.INTERNAL_SERVER_ERROR),
  };
}
