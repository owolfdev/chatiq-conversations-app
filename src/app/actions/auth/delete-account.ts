// src/app/actions/auth/delete-account.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";

/**
 * Deletes the current user's account and all associated data.
 * 
 * This action:
 * 1. Verifies the user is authenticated
 * 2. Uses admin client to delete user from auth.users
 * 3. Database trigger automatically cascades deletion of:
 *    - User profile (bot_user_profiles)
 *    - Teams (bot_teams where owner_id matches)
 *    - Team memberships (bot_team_members)
 *    - Bots, documents, conversations, etc. (via foreign key cascades)
 * 4. Redirects to home page after deletion
 * 
 * @throws Error if user is not authenticated or deletion fails
 */
export async function deleteAccount() {
  const supabase = await createClient();
  
  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: You must be signed in to delete your account");
  }

  console.log(`[delete-account] Attempting to delete user: ${user.id}`);

  // Use admin client to delete user from auth.users
  // This will trigger the handle_user_deletion() function which cascades
  // deletion of all related data
  const adminClient = createAdminClient();
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("[delete-account] Error deleting user:", deleteError);
    throw new Error(`Failed to delete account: ${deleteError.message}`);
  }

  console.log(`[delete-account] Successfully deleted user: ${user.id}`);

  // Sign out and redirect to home
  await supabase.auth.signOut();
  redirect("/");
}
