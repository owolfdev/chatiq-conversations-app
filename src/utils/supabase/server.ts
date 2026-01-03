//src/utils/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { getCookieDomain } from "@/utils/supabase/cookie-domain";

export const createClient = async () => {
  const cookieStore = await cookies();
  const cookieDomain = getCookieDomain({ appUrl: env.NEXT_PUBLIC_APP_URL });

  // Use validated env vars
  return createServerClient(
    env.SUPABASE_URL,
    env.SUPABASE_CLIENT_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            if (typeof cookieStore.set !== "function") return;
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, {
                ...(options ?? {}),
                ...(cookieDomain ? { domain: cookieDomain } : {}),
              });
            }
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            // Next.js 16 will throw when attempting to set cookies from a Server Component.
          }
        },
      },
    }
  );
};
