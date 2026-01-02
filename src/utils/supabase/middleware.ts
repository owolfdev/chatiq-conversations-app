//src/utils/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isBetaModeEnabled, isEmailAllowed } from "@/lib/beta-access";

// Access environment variables directly to avoid validation errors in middleware
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clientKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, clientKey };
}

export const updateSession = async (request: NextRequest) => {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const pathname = request.nextUrl.pathname;

  try {
    // Get Supabase config directly from env vars (bypass validation)
    const { url, clientKey } = getSupabaseConfig();
    
    // Validate required environment variables before proceeding
    if (!url || !clientKey) {
      console.error("Missing Supabase environment variables");
      // Allow public paths even if Supabase is misconfigured
      const publicPaths = ["/", "/sign-in", "/sign-up", "/forgot-password", "/beta-access", "/contact", "/legal", "/product", "/pricing", "/blog", "/docs", "/api", "/_next", "/favicon.ico"];
      if (publicPaths.some((path) => pathname === path || pathname.startsWith(path + "/"))) {
        return response;
      }
      // For protected paths, return error response instead of redirecting
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createServerClient(url, clientKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, {
              ...(options ?? {}),
              domain: ".chatiq.io",
            });
          }
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // IMPORTANT: Always allow /beta-access to be accessed without any redirects
    // This must be checked BEFORE any beta mode logic to prevent redirect loops
    if (pathname === "/beta-access") {
      return response;
    }

    // Beta mode protection - check if beta mode is enabled
    // Wrap in try-catch to prevent crashes if beta access functions fail
    try {
      if (isBetaModeEnabled()) {
        // Allow access to auth pages, API routes, static assets, and public pages
        const publicPaths = [
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/auth/callback",
          "/contact",
          "/legal",
          "/product",
          "/pricing",
          "/blog",
          "/docs",
          "/api",
          "/_next",
          "/favicon.ico",
          "/", // Homepage should be accessible
        ];

        const isPublicPath = publicPaths.some((path) =>
          pathname === path || pathname.startsWith(path + "/")
        );

        // If not a public path and user is not authenticated, redirect to beta access page
        if (!isPublicPath && (!user || error)) {
          return NextResponse.redirect(new URL("/beta-access", request.url));
        }

        // If user is authenticated, check email allowlist (if configured)
        if (user && !error) {
          const userEmail = user.email;
          if (userEmail && !isEmailAllowed(userEmail)) {
            // User is authenticated but not in allowlist - redirect to beta access
            return NextResponse.redirect(new URL("/beta-access", request.url));
          }
        }
      }
    } catch (betaError) {
      // If beta mode check fails, log but don't block access
      // This prevents middleware crashes if beta access functions have issues
      console.error("Beta mode check error (allowing access):", betaError);
      // Continue with normal flow - don't block access if beta check fails
    }

    // Basic protection for existing protected routes
    const isProtectedRoute =
      pathname.startsWith("/protected") || pathname.startsWith("/dev");

    if (!user || error) {
      if (isProtectedRoute) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }
      return response;
    }

    // Additional /dev route role check
    if (pathname.startsWith("/docs/dev")) {
      const { data: profile } = await supabase
        .from("bot_user_profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || profile.role !== "admin") {
        return NextResponse.redirect(new URL("/not-authorized", request.url));
      }
    }

    return response;
  } catch (err) {
    console.error("Session middleware error:", err);
    
    // Log detailed error for debugging
    if (err instanceof Error) {
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
        pathname,
      });
    }

    // For public paths, allow access even if there's an error
    const publicPaths = ["/", "/sign-in", "/sign-up", "/forgot-password", "/beta-access", "/contact", "/legal", "/product", "/pricing", "/blog", "/docs", "/api", "/_next", "/favicon.ico"];
    if (publicPaths.some((path) => pathname === path || pathname.startsWith(path + "/"))) {
      return response;
    }

    // For protected paths, redirect to sign-in
    // But only if it's not already a sign-in related path to avoid redirect loops
    if (!pathname.startsWith("/sign-in") && !pathname.startsWith("/sign-up") && !pathname.startsWith("/forgot-password")) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // If we're already on a sign-in related path, just return the response
    return response;
  }
};
