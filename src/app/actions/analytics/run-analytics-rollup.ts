"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { addDays } from "date-fns";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function runAnalyticsRollup({
  teamId,
  startDate,
  endDate,
}: {
  teamId: string;
  startDate: string;
  endDate: string;
}) {
  const supabase = createAdminClient();
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  const endExclusive = addDays(end, 1).toISOString();

  const { data: events, error } = await supabase
    .from("analytics_events")
    .select("event_type, occurred_at, bot_id, conversation_id, user_id")
    .eq("team_id", teamId)
    .gte("occurred_at", start.toISOString())
    .lt("occurred_at", endExclusive);

  if (error) {
    console.error("Failed to fetch analytics events for rollup:", error);
    return { ok: false };
  }

  const rollups = new Map<
    string,
    {
      team_id: string;
      bot_id: string | null;
      rollup_date: string;
      messages_user: number;
      messages_bot: number;
      conversations_started: number;
      activeUsers: Set<string>;
      uniqueConversations: Set<string>;
    }
  >();

  for (const event of events ?? []) {
    const dateKey = toDateKey(new Date(event.occurred_at));
    const userKey = event.user_id ?? event.conversation_id ?? "anon";
    const conversationKey = event.conversation_id ?? "unknown";

    const keys = [event.bot_id ?? "", "__team__"];
    for (const botKey of keys) {
      const storageKey = `${botKey}-${dateKey}`;
      const existing = rollups.get(storageKey) ?? {
        team_id: teamId,
        bot_id: botKey === "__team__" ? null : botKey || null,
        rollup_date: dateKey,
        messages_user: 0,
        messages_bot: 0,
        conversations_started: 0,
        activeUsers: new Set<string>(),
        uniqueConversations: new Set<string>(),
      };

      if (event.event_type === "message_user") {
        existing.messages_user += 1;
        existing.activeUsers.add(userKey);
        existing.uniqueConversations.add(conversationKey);
      }
      if (event.event_type === "message_bot") {
        existing.messages_bot += 1;
        existing.activeUsers.add(userKey);
        existing.uniqueConversations.add(conversationKey);
      }
      if (event.event_type === "conversation_started") {
        existing.conversations_started += 1;
        existing.uniqueConversations.add(conversationKey);
      }

      rollups.set(storageKey, existing);
    }
  }

  const payload = Array.from(rollups.values()).map((row) => ({
    team_id: row.team_id,
    bot_id: row.bot_id,
    rollup_date: row.rollup_date,
    messages_user: row.messages_user,
    messages_bot: row.messages_bot,
    conversations_started: row.conversations_started,
    active_users: row.activeUsers.size,
    unique_conversations: row.uniqueConversations.size,
  }));

  if (!payload.length) {
    return { ok: true };
  }

  const { error: upsertError } = await supabase
    .from("analytics_daily_rollups")
    .upsert(payload, {
      onConflict: "team_id,bot_id,rollup_date",
    });

  if (upsertError) {
    console.error("Failed to upsert analytics rollups:", upsertError);
    return { ok: false };
  }

  return { ok: true };
}
