"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Retry failed embedding jobs by resetting them to pending status.
 * This allows the worker to pick them up again.
 */
export async function retryFailedEmbeddings(): Promise<{
  success: boolean;
  retried: number;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      retried: 0,
      error: "Unauthorized",
    };
  }

  const teamId = await getUserTeamId(user.id);

  if (!teamId) {
    return {
      success: false,
      retried: 0,
      error: "No team found",
    };
  }

  const admin = createAdminClient();

  try {
    // Reset failed jobs to pending (up to 50 at a time to avoid overwhelming)
    const { data, error } = await admin
      .from("bot_embedding_jobs")
      .update({
        status: "pending",
        attempts: 0,
        error: null,
        locked_at: null,
        locked_by: null,
      })
      .eq("team_id", teamId)
      .eq("status", "failed")
      .limit(50)
      .select("id");

    if (error) {
      console.error("Failed to retry failed embeddings", error);
      return {
        success: false,
        retried: 0,
        error: error.message,
      };
    }

    return {
      success: true,
      retried: data?.length ?? 0,
    };
  } catch (error) {
    console.error("Failed to retry failed embeddings", error);
    return {
      success: false,
      retried: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

