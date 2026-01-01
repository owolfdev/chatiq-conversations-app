import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

  // Debug: Log all query parameters
  console.log("[auth/callback] Full URL:", requestUrl.toString());
  console.log(
    "[auth/callback] All query params:",
    Object.fromEntries(requestUrl.searchParams)
  );
  console.log("[auth/callback] code:", code ? "present" : "missing");
  console.log("[auth/callback] redirect_to:", redirectTo || "none");

  const supabase = await createClient();

  // Handle code-based flow (OAuth, magic links, etc.)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] Exchange error:", error);
      // Redirect to sign-in on error
      return NextResponse.redirect(
        `${origin}/sign-in?error=${encodeURIComponent(error.message)}`
      );
    }
    console.log("[auth/callback] Code exchanged successfully");
  } else {
    // For token-based email verification, Supabase's verify endpoint already
    // authenticated the user and set cookies. Just verify the session exists.
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error("[auth/callback] No authenticated user found:", error);
      return NextResponse.redirect(
        `${origin}/sign-in?error=Authentication failed`
      );
    }
    console.log("[auth/callback] User authenticated via token:", user.id);
  }

  // Only use redirect_to if explicitly provided (for password reset, etc.)
  // BUT ignore /protected redirects (likely from Supabase default settings)
  // Default redirect to home page after signup/signin/email confirmation
  if (redirectTo && !redirectTo.startsWith("/protected")) {
    console.log("[auth/callback] Using redirect_to param:", redirectTo);
    // Handle both absolute URLs and relative paths
    if (redirectTo.startsWith("http://") || redirectTo.startsWith("https://")) {
      return NextResponse.redirect(redirectTo);
    }
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // URL to redirect to after sign in/sign up process completes
  const finalRedirect = `${origin}/dashboard`;
  console.log("[auth/callback] Final redirect to:", finalRedirect);
  return NextResponse.redirect(finalRedirect);
}
