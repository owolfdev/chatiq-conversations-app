// lib/plans/get-bot-plan-limit.ts
import { createClient } from "@/utils/supabase/server";
import { resolvePlanRateLimit } from "@/config/plans";
import type { PlanId } from "@/lib/plans/quotas";

export async function getBotPlanLimit(slug: string): Promise<number | null> {
  const supabase = await createClient();

  const { data: bot, error: botError } = await supabase
    .from("bot_bots")
    .select("user_id")
    .eq("slug", slug)
    .maybeSingle();

  if (botError || !bot) return resolvePlanRateLimit("free");

  const { data: profile } = await supabase
    .from("bot_user_profiles")
    .select("plan")
    .eq("id", bot.user_id)
    .maybeSingle();

  const plan = profile?.plan ?? "free";
  return resolvePlanRateLimit(plan as PlanId);
}
