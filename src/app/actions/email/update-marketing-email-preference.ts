"use server";

import { createClient } from "@/utils/supabase/server";

export async function updateMarketingEmailPreference(marketingEmails: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("bot_user_profiles")
    .update({ marketing_emails: marketingEmails })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to update marketing email preference:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
