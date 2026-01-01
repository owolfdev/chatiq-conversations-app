// src/lib/geo/currency.ts
// Utility functions for geolocation-based currency detection

import type { BillingCurrency } from "@/lib/stripe";

/**
 * Detects the user's country from request headers.
 * Supports Vercel (x-vercel-ip-country) and Cloudflare (CF-IPCountry) headers.
 *
 * @param headers - Request headers object
 * @returns ISO 3166-1 alpha-2 country code (e.g., "TH", "US") or null if not detected
 */
export function detectCountryFromHeaders(
  headers: Headers | Record<string, string | string[] | null | undefined>
): string | null {
  // Try Vercel header first (most common)
  const vercelCountry = getHeaderValue(headers, "x-vercel-ip-country");
  if (vercelCountry && typeof vercelCountry === "string") {
    return vercelCountry.toUpperCase();
  }

  // Try Cloudflare header
  const cloudflareCountry = getHeaderValue(headers, "cf-ipcountry");
  if (cloudflareCountry && typeof cloudflareCountry === "string") {
    return cloudflareCountry.toUpperCase();
  }

  // Try other common headers
  const country = getHeaderValue(headers, "x-country-code");
  if (country && typeof country === "string") {
    return country.toUpperCase();
  }

  return null;
}

/**
 * Determines the billing currency based on country code.
 * Returns THB for Thailand, USD for all other countries.
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "TH", "US")
 * @returns BillingCurrency ("thb" for Thailand, "usd" for others)
 */
export function getCurrencyFromCountry(
  countryCode: string | null
): BillingCurrency {
  // Thailand gets THB, everyone else gets USD
  if (countryCode === "TH") {
    return "thb";
  }
  return "usd";
}

/**
 * Detects currency from request headers.
 * Convenience function that combines country detection and currency mapping.
 *
 * @param headers - Request headers object
 * @returns BillingCurrency ("thb" for Thailand, "usd" for others)
 */
export function detectCurrencyFromHeaders(
  headers: Headers | Record<string, string | string[] | null | undefined>
): BillingCurrency {
  const country = detectCountryFromHeaders(headers);
  return getCurrencyFromCountry(country);
}

/**
 * Helper to safely get header value from different header types.
 */
function getHeaderValue(
  headers: Headers | Record<string, string | string[] | null | undefined>,
  key: string
): string | null {
  if (headers instanceof Headers) {
    return headers.get(key);
  }

  const value = headers[key];
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return null;
}

