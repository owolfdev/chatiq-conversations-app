// /proxy.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

function isHtmlNavigation(req: NextRequest) {
  const dest = req.headers.get("sec-fetch-dest") || "";
  const mode = req.headers.get("sec-fetch-mode") || "";
  const accept = req.headers.get("accept") || "";
  // Covers Chrome/Edge (sec-fetch-* headers) and Safari (accept)
  const looksLikeDoc =
    dest === "document" || mode === "navigate" || accept.includes("text/html");
  return req.method === "GET" && looksLikeDoc;
}

export async function proxy(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  const APP_HOST = "app.chatiq.io";
  const SITE_HOST = "www.chatiq.io";
  const ROOT_HOST = "chatiq.io";
  const appRoutePrefixes = [
    "/dashboard",
    "/chat",
    "/profile",
    "/invite",
    "/protected",
    "/beta-access",
    "/not-authorized",
    "/test",
    "/test-geo",
    "/auth",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
  ];

  const authAllowlistPrefixes = [
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/auth",
    "/invite",
    "/beta-access",
    "/not-authorized",
  ];
  const bypassPrefixes = ["/_next", "/api"];
  const bypassExact = [
    "/favicon.ico",
    "/icon.png",
    "/icon.svg",
    "/apple-icon.png",
    "/manifest.json",
    "/robots.txt",
    "/sitemap.xml",
  ];

  const isAppPath = appRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isAuthAllowed = authAllowlistPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const shouldBypass =
    bypassExact.includes(pathname) ||
    bypassPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local");
  const disableHostRedirects =
    process.env.NEXT_PUBLIC_DISABLE_HOST_REDIRECTS === "1" ||
    process.env.NEXT_PUBLIC_DISABLE_HOST_REDIRECTS === "true";
  const isPreview = hostname.endsWith(".vercel.app");

  if (!shouldBypass && !isLocal && !isPreview && !disableHostRedirects) {
    if (hostname === ROOT_HOST || hostname === APP_HOST) {
      const url = request.nextUrl.clone();
      url.hostname = SITE_HOST;
      return NextResponse.redirect(url);
    }
  }

  const hasSupabaseCookies =
    request.cookies.has("sb-access-token") ||
    request.cookies.has("sb-refresh-token");

  if (isAppPath && !isAuthAllowed && !hasSupabaseCookies) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const shouldRefresh = isHtmlNavigation(request) && hasSupabaseCookies;

  let response: NextResponse;
  try {
    response = shouldRefresh
      ? await updateSession(request)
      : NextResponse.next();
  } catch (err) {
    console.error("[proxy] updateSession failed:", err);
    response = NextResponse.next(); // fail-open so app still loads
  }

  // Optional diagnostics
  if (process.env.NEXT_PUBLIC_COOKIE_DIAG === "1") {
    console.log("[431 diag]", {
      path: request.nextUrl.pathname,
      inCookieBytes: (request.headers.get("cookie") ?? "").length,
      outSetCookieBytes: (response.headers.get("set-cookie") ?? "").length,
      refreshed: shouldRefresh,
    });
  }

  return response;
}

// Narrow scope to areas that need session refresh
export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
