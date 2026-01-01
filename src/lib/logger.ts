// src/lib/logger.ts
// Structured logger with sensitive data redaction and Sentry integration

// Dynamic import to avoid issues in server/client contexts
let Sentry: typeof import("@sentry/nextjs") | null = null;

// Lazy load Sentry only when needed
async function getSentry() {
  if (Sentry === null && typeof window !== "undefined") {
    try {
      Sentry = await import("@sentry/nextjs");
    } catch {
      // Sentry not available
    }
  } else if (Sentry === null) {
    try {
      Sentry = await import("@sentry/nextjs");
    } catch {
      // Sentry not available
    }
  }
  return Sentry;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

/**
 * Patterns to redact from logs (sensitive data)
 */
const SENSITIVE_PATTERNS = [
  // API Keys
  /Bearer\s+[A-Za-z0-9\-_]{20,}/gi,
  /sk-[A-Za-z0-9]{32,}/gi,
  /sk_live_[A-Za-z0-9]{32,}/gi,
  /sk_test_[A-Za-z0-9]{32,}/gi,
  // OpenAI keys
  /sk-[A-Za-z0-9]{20,}/gi,
  // Supabase keys
  /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\./gi, // JWT tokens
  // Passwords
  /(password|pwd|passwd|secret|token|api[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9\-_]{8,}["']?/gi,
  // Credit cards (basic pattern)
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  // Email addresses (optional - can be disabled)
  // /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
];

/**
 * Redacts sensitive data from a string
 */
function redactSensitiveData(data: unknown): unknown {
  if (typeof data === "string") {
    let redacted = data;
    for (const pattern of SENSITIVE_PATTERNS) {
      redacted = redacted.replace(pattern, (match) => {
        // Keep first 4 and last 4 chars, redact the middle
        if (match.length > 8) {
          return `${match.slice(0, 4)}...${match.slice(-4)}`;
        }
        return "***REDACTED***";
      });
    }
    return redacted;
  }

  if (typeof data === "object" && data !== null) {
    if (Array.isArray(data)) {
      return data.map(redactSensitiveData);
    }

    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip redaction for certain safe keys
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("id") ||
        lowerKey.includes("url") ||
        lowerKey.includes("slug") ||
        lowerKey.includes("name") ||
        lowerKey.includes("title")
      ) {
        redacted[key] = value;
      } else {
        redacted[key] = redactSensitiveData(value);
      }
    }
    return redacted;
  }

  return data;
}

/**
 * Formats log entry for console output
 */
function formatLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const contextStr = context
    ? ` ${JSON.stringify(redactSensitiveData(context))}`
    : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Structured logger with Sentry integration
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private enableSentry =
    process.env.NEXT_PUBLIC_ENABLE_SENTRY === "true" &&
    typeof window !== "undefined" ? true : process.env.NEXT_PUBLIC_ENABLE_SENTRY === "true";

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(formatLogEntry("debug", message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(formatLogEntry("info", message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    const redactedContext = redactSensitiveData(context);
    console.warn(formatLogEntry("warn", message, context));

    if (this.enableSentry) {
      // Fire and forget - don't block on Sentry
      getSentry().then((sentry) => {
        if (sentry) {
          sentry.captureMessage(message, {
            level: "warning",
            extra: redactedContext as Record<string, unknown>,
          });
        }
      }).catch(() => {
        // Ignore Sentry errors
      });
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const redactedContext = redactSensitiveData(context);
    console.error(formatLogEntry("error", message, context), error);

    if (this.enableSentry) {
      // Fire and forget - don't block on Sentry
      getSentry().then((sentry) => {
        if (sentry) {
          if (error instanceof Error) {
            sentry.captureException(error, {
              level: "error",
              extra: {
                message,
                ...(redactedContext as Record<string, unknown>),
              },
            });
          } else {
            sentry.captureMessage(message, {
              level: "error",
              extra: {
                error: String(error),
                ...(redactedContext as Record<string, unknown>),
              },
            });
          }
        }
      }).catch(() => {
        // Ignore Sentry errors
      });
    }
  }

  /**
   * Logs an error with additional context for Sentry
   */
  captureException(
    error: Error,
    context?: LogContext & {
      tags?: Record<string, string>;
      user?: { id?: string; email?: string; username?: string };
      level?: "debug" | "info" | "warning" | "error" | "fatal";
    }
  ): void {
    const redactedContext = redactSensitiveData(context);
    console.error("Exception captured:", error, redactedContext);

    if (this.enableSentry) {
      // Fire and forget - don't block on Sentry
      getSentry().then((sentry) => {
        if (sentry) {
          sentry.withScope((scope) => {
            if (context?.tags) {
              Object.entries(context.tags).forEach(([key, value]) => {
                scope.setTag(key, value);
              });
            }

            if (context?.user) {
              scope.setUser(context.user);
            }

            if (context?.level) {
              scope.setLevel(context.level);
            }

            scope.setContext(
              "additional",
              redactedContext as Record<string, unknown>
            );
            sentry.captureException(error);
          });
        }
      }).catch(() => {
        // Ignore Sentry errors
      });
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { redactSensitiveData };

