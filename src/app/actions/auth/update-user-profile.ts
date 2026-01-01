// src/app/actions/auth/update-user-profile.ts
"use server";

import { createClient } from "@/utils/supabase/server";

interface UpdateProfileInput {
  userId: string;
  name?: string; // coming from client
  username?: string;
  bio?: string;
}

export async function updateUserProfile(input: UpdateProfileInput) {
  const { userId, name, ...rest } = input;
  const supabase = await createClient();

  const { error } = await supabase
    .from("bot_user_profiles")
    .update({
      full_name: name, // map to DB column
      ...rest,
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to update profile:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
