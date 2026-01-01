//src/utils/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export const createClient = () => {
  // Use validated env vars
  return createBrowserClient(env.SUPABASE_URL, env.SUPABASE_CLIENT_KEY);
};
