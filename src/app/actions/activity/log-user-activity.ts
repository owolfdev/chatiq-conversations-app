"use server";

import { z } from "zod";
import { createClient } from "@/utils/supabase/server";

const logSchema = z.object({
  userId: z.string(),
  type: z.string(),
  message: z.string(),
  metadata: z.record(z.any()).optional(),
});

export async function logUserActivity(input: z.infer<typeof logSchema>) {
  const parsed = logSchema.safeParse(input);
  if (!parsed.success) {
    console.error("Invalid logUserActivity input", parsed.error.flatten());
    return;
  }

  const supabase = await createClient();
  const { userId, type, message, metadata } = parsed.data;

  const { error } = await supabase.from("bot_user_activity_logs").insert({
    user_id: userId,
    type,
    message,
    metadata,
  });

  if (error) {
    console.error("Failed to log user activity:", error);
  }
}
