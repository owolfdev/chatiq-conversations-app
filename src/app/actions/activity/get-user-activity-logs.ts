//src/app/actions/activity/get-user-activity-logs.ts
import { createClient } from "@/utils/supabase/server";

export async function getUserActivityLogs(
  userId: string,
  offset = 0,
  limit = 10
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bot_user_activity_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Failed to fetch activity logs:", error);
    return [];
  }

  return data;
}
