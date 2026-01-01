// src/utils/supabase/admin.ts
// Admin client for privileged operations (uses service role key)
// This should ONLY be used in server actions/API routes, never in client components

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Creates a Supabase admin client with elevated key (secret preferred, service_role fallback).
 * ⚠️ WARNING: This bypasses Row Level Security - use only for admin operations!
 * 
 * This client has full access to the database and auth operations.
 * Use it only for operations that require elevated privileges, such as:
 * - Deleting users from auth.users
 * - Admin operations
 * - System-level data operations
 */
export function createAdminClient() {
  return createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_ADMIN_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
