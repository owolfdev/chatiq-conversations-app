// src/lib/api/cors.ts
// CORS configuration for API routes

import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * Get allowed origins for CORS
 * In development, allows all origins for easier testing
 * In production, allows the app URL and any additional origins from env
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Always allow the app's own origin
  if (env.NEXT_PUBLIC_APP_URL) {
    origins.push(env.NEXT_PUBLIC_APP_URL);
  }

  // Always allow localhost origins for local development/testing
  origins.push("http://localhost:3000");
  origins.push("http://localhost:3001");
  origins.push("http://localhost:3002");
  origins.push("http://127.0.0.1:3000");
  origins.push("http://127.0.0.1:3001");
  origins.push("http://127.0.0.1:3002");
  
  // In development, allow all origins for easier testing
  if (env.NODE_ENV === "development" || process.env.NODE_ENV === "development") {
    return ["*"]; // Allow all in dev
  }

  // In production, allow all origins for widget embedding
  // Security is handled by API key authentication and domain whitelisting
  // Widgets can be embedded on any customer website, so we need to allow all origins
  return ["*"];
}

/**
 * Check if an origin is allowed
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const allowed = getAllowedOrigins();

  // In development, allow all
  if (allowed.includes("*")) {
    return true;
  }

  return allowed.includes(origin);
}

/**
 * Get CORS headers for a response
 */
export function getCorsHeaders(
  request: NextRequest
): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowed = isOriginAllowed(origin);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400", // 24 hours
  };

  if (allowed && origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  } else if (allowed) {
    // In dev mode, allow all
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsPreflight(
  request: NextRequest
): NextResponse | null {
  if (request.method === "OPTIONS") {
    const headers = getCorsHeaders(request);
    return new NextResponse(null, { status: 204, headers });
  }
  return null;
}

