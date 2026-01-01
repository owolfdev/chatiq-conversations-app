//src/app/actions/auth/get-user-with-profile.ts
"use server";
import { createClient } from "@/utils/supabase/server";

export async function getUserWithProfile() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("bot_user_profiles")
    .select(
      "full_name, plan, is_verified, username, bio, avatar_url, public_email, website, location, created_at"
    )

    .eq("id", user.id)
    .single();

  if (profileError) {
    return {
      id: user.id,
      email: user.email,
      full_name: null,
      plan: null,
      is_verified: null,
      username: null,
      bio: null,
      avatar_url: null,
      public_email: null,
      website: null,
      location: null,
      created_at: null,
      twitter_handle: null,
      github_handle: null,
    };
  }

  return {
    id: user.id,
    email: user.email,
    ...profile,
  };
}
