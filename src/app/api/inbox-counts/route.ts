import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import {
  INBOX_TOPIC_SHORTCUTS,
  zeroTopicShortcutCountRecord,
} from "@/lib/inbox/inbox-topic-shortcuts";
import { CONVERSATION_HOST_BOT_EMBED } from "@/lib/conversations/bot-conversation-bot-relationship";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeTeamId = await getUserTeamId(user.id);
  if (!activeTeamId) {
    return NextResponse.json({
      openConversations: 0,
      pendingBookings: 0,
      upcomingConfirmedBookings: 0,
      unscheduledBookings: 0,
      topicShortcutCounts: zeroTopicShortcutCountRecord(),
    });
  }

  const nowIso = new Date().toISOString();
  const teamScopedConversationSelect =
    `id, ${CONVERSATION_HOST_BOT_EMBED}(team_id)` as const;

  const topicCountQueries = INBOX_TOPIC_SHORTCUTS.map((row) =>
    supabase
      .from("bot_conversations")
      .select(teamScopedConversationSelect, { count: "exact", head: true })
      .eq("bot_bots.team_id", activeTeamId)
      .in("topic", [...row.matchTopics])
  );

  const [
    openResult,
    pendingResult,
    upcomingResult,
    unscheduledResult,
    ...topicCountResults
  ] = await Promise.all([
    supabase
      .from("bot_conversations")
      .select(teamScopedConversationSelect, { count: "exact", head: true })
      .eq("bot_bots.team_id", activeTeamId)
      .or("resolution_status.is.null,resolution_status.neq.resolved"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("team_id", activeTeamId)
      .eq("status", "pending"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("team_id", activeTeamId)
      .eq("status", "confirmed")
      .or(`appointment_date.is.null,appointment_date.gt.${nowIso}`),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("team_id", activeTeamId)
      .is("start_at", null)
      .in("status", ["pending", "confirmed"]),
    ...topicCountQueries,
  ]);

  const topicShortcutCounts: Record<string, number> = {};
  for (let i = 0; i < INBOX_TOPIC_SHORTCUTS.length; i++) {
    const shortcut = INBOX_TOPIC_SHORTCUTS[i];
    const row = topicCountResults[i];
    if (row?.error) {
      console.error("inbox topic count failed", shortcut.id, row.error);
      topicShortcutCounts[shortcut.id] = 0;
    } else {
      topicShortcutCounts[shortcut.id] = row?.count ?? 0;
    }
  }

  if (
    openResult.error ||
    pendingResult.error ||
    upcomingResult.error ||
    unscheduledResult.error
  ) {
    return NextResponse.json(
      { error: "Failed to load inbox counts" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    openConversations: openResult.count ?? 0,
    pendingBookings: pendingResult.count ?? 0,
    upcomingConfirmedBookings: upcomingResult.count ?? 0,
    unscheduledBookings: unscheduledResult.count ?? 0,
    topicShortcutCounts,
  });
}
