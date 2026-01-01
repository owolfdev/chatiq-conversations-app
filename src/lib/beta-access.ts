// src/lib/beta-access.ts
// Beta access control utilities
// Access environment variables directly to avoid validation errors in middleware

/**
 * Check if beta mode is enabled
 */
export function isBetaModeEnabled(): boolean {
  try {
    const betaMode = process.env.BETA_MODE || process.env.NEXT_PUBLIC_BETA_MODE;
    return betaMode === "true" || betaMode === "1";
  } catch {
    return false; // Default to disabled if there's any error
  }
}

/**
 * Check if a specific email is in the beta allowlist
 */
export function isEmailAllowed(email: string): boolean {
  try {
    if (!isBetaModeEnabled()) {
      return true; // Beta mode disabled = everyone allowed
    }

    const allowlistStr = process.env.BETA_ALLOWLIST_EMAILS || "";
    const allowlist = allowlistStr.split(",").map((e) => e.trim()).filter(Boolean);
    
    // If allowlist is empty, allow all authenticated users
    if (allowlist.length === 0) {
      return true;
    }

    return allowlist.includes(email.toLowerCase());
  } catch {
    // If there's an error checking allowlist, default to allowing access
    // This prevents blocking users if there's a configuration issue
    return true;
  }
}

/**
 * Get beta access message
 */
export function getBetaAccessMessage(): string {
  try {
    return (
      process.env.BETA_ACCESS_MESSAGE ||
      "ChatIQ is currently in beta. Please sign in to access the platform."
    );
  } catch {
    return "ChatIQ is currently in beta. Please sign in to access the platform.";
  }
}

