import { addDays, formatDistanceToNow } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsOverview } from "@/types/analytics";
import type { DashboardMetrics } from "@/types/metrics";

const EVENT_LABELS: Record<string, string> = {
  conversation_started: "Conversation started",
  message_user: "User sent a message",
  message_bot: "Bot replied",
};

const EMPTY_METRICS: DashboardMetrics = {
  totalMessages: 0,
  totalConversations: 0,
  activeUsers: 0,
  avgResponseTime: 0,
  satisfactionRate: 0,
  totalChatbots: 0,
  monthlyGrowth: 0,
  totalDocuments: 0,
  totalApiCalls: 0,
  chatbotPerformance: [],
  recentActivity: [],
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDateKeys(start: Date, end: Date) {
  const keys: string[] = [];
  let cursor = new Date(Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  ));
  const last = new Date(Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate()
  ));

  while (cursor <= last) {
    keys.push(toDateKey(cursor));
    cursor = addDays(cursor, 1);
  }

  return keys;
}

function emptyOverview(dateKeys: string[]): AnalyticsOverview {
  return {
    metrics: { ...EMPTY_METRICS },
    previousMetrics: {
      totalMessages: 0,
      totalConversations: 0,
      activeUsers: 0,
    },
    series: dateKeys.map((date) => ({
      date,
      userMessages: 0,
      botMessages: 0,
      totalMessages: 0,
      activeUsers: 0,
      conversations: 0,
    })),
    chatbotPerformance: [],
    recentActivity: [],
  };
}

export async function getAnalyticsOverview({
  supabase,
  teamId,
  startDate,
  endDate,
}: {
  supabase: SupabaseClient;
  teamId: string;
  startDate: Date;
  endDate: Date;
}): Promise<AnalyticsOverview> {
  const dateKeys = buildDateKeys(startDate, endDate);
  if (!dateKeys.length) {
    return emptyOverview([]);
  }
  const currentDateSet = new Set(dateKeys);

  const rangeDays = dateKeys.length;
  const prevEnd = addDays(startDate, -1);
  const prevStart = addDays(startDate, -rangeDays);

  const endExclusiveIso = new Date(Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate()
  )).toISOString();
  const endExclusivePlus = addDays(new Date(endExclusiveIso), 1).toISOString();

  const prevStartIso = new Date(Date.UTC(
    prevStart.getUTCFullYear(),
    prevStart.getUTCMonth(),
    prevStart.getUTCDate()
  )).toISOString();

  const { data: bots } = await supabase
    .from("bot_bots")
    .select("id, name, status")
    .eq("team_id", teamId);

  const botNameMap = new Map<string, string>();
  const botStatusMap = new Map<string, string>();
  (bots ?? []).forEach((bot) => {
    botNameMap.set(bot.id, bot.name);
    botStatusMap.set(bot.id, bot.status ?? "active");
  });

  const { data: events, error } = await supabase
    .from("analytics_events")
    .select("id, event_type, occurred_at, bot_id, conversation_id, user_id")
    .eq("team_id", teamId)
    .gte("occurred_at", prevStartIso)
    .lt("occurred_at", endExclusivePlus);

  if (error || !events) {
    if (error) {
      console.error("Failed to fetch analytics events:", error);
    }
    return emptyOverview(dateKeys);
  }

  const seriesMap = new Map(
    dateKeys.map((date) => [
      date,
      {
        userMessages: 0,
        botMessages: 0,
        totalMessages: 0,
        activeUsers: new Set<string>(),
        conversations: 0,
      },
    ])
  );

  const previousTotals = {
    totalMessages: 0,
    totalConversations: 0,
    activeUsers: new Set<string>(),
  };

  const currentTotals = {
    totalMessages: 0,
    totalConversations: 0,
    activeUsers: new Set<string>(),
    totalApiCalls: 0,
  };

  const perBot = new Map<
    string,
    { messages: number; users: Set<string> }
  >();

  const currentRecentEvents: typeof events = [];

  for (const event of events) {
    const occurredAt = new Date(event.occurred_at);
    const dateKey = toDateKey(occurredAt);
    const userKey = event.user_id ?? event.conversation_id ?? event.id;

    const isCurrent = currentDateSet.has(dateKey);
    const isPrevious =
      !isCurrent &&
      dateKey >= toDateKey(prevStart) &&
      dateKey <= toDateKey(prevEnd);

    if (isCurrent) {
      currentRecentEvents.push(event);
      const bucket = seriesMap.get(dateKey);
      if (bucket) {
        bucket.activeUsers.add(userKey);
      }
      currentTotals.activeUsers.add(userKey);
    }

    if (event.event_type === "conversation_started") {
      if (isCurrent) {
        const bucket = seriesMap.get(dateKey);
        if (bucket) {
          bucket.conversations += 1;
        }
        currentTotals.totalConversations += 1;
      } else if (isPrevious) {
        previousTotals.totalConversations += 1;
      }
    }

    if (event.event_type === "message_user" || event.event_type === "message_bot") {
      if (isCurrent) {
        const bucket = seriesMap.get(dateKey);
        if (bucket) {
          if (event.event_type === "message_user") {
            bucket.userMessages += 1;
            currentTotals.totalApiCalls += 1;
          } else {
            bucket.botMessages += 1;
          }
        }
        currentTotals.totalMessages += 1;
      } else if (isPrevious) {
        previousTotals.totalMessages += 1;
      }

      if (event.bot_id) {
        const entry = perBot.get(event.bot_id) ?? {
          messages: 0,
          users: new Set<string>(),
        };
        entry.messages += 1;
        entry.users.add(userKey);
        perBot.set(event.bot_id, entry);
      }
    }

    if (isPrevious) {
      previousTotals.activeUsers.add(userKey);
    }
  }

  const series = dateKeys.map((date) => {
    const bucket = seriesMap.get(date);
    const userMessages = bucket?.userMessages ?? 0;
    const botMessages = bucket?.botMessages ?? 0;
    const totalMessages = userMessages + botMessages;
    const activeUsers = bucket?.activeUsers.size ?? 0;
    const conversations = bucket?.conversations ?? 0;
    return {
      date,
      userMessages,
      botMessages,
      totalMessages,
      activeUsers,
      conversations,
    };
  });

  const chatbotPerformance = Array.from(perBot.entries()).map(
    ([botId, stats]) => ({
      name: botNameMap.get(botId) ?? "Unknown bot",
      messages: stats.messages,
      users: stats.users.size,
      satisfaction: 0,
      status: botStatusMap.get(botId) ?? "active",
    })
  );

  const recentActivity = currentRecentEvents
    .sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() -
        new Date(a.occurred_at).getTime()
    )
    .slice(0, 8)
    .map((event) => ({
      time: formatDistanceToNow(new Date(event.occurred_at), {
        addSuffix: true,
      }),
      event: EVENT_LABELS[event.event_type] ?? event.event_type,
      chatbot: event.bot_id
        ? botNameMap.get(event.bot_id) ?? "Unknown bot"
        : "Unknown bot",
    }));

  const metrics: DashboardMetrics = {
    ...EMPTY_METRICS,
    totalMessages: currentTotals.totalMessages,
    totalConversations: currentTotals.totalConversations,
    activeUsers: currentTotals.activeUsers.size,
    totalChatbots: bots?.length ?? 0,
    monthlyGrowth: previousTotals.totalMessages
      ? Math.round(
          ((currentTotals.totalMessages - previousTotals.totalMessages) /
            previousTotals.totalMessages) *
            100
        )
      : 0,
    totalApiCalls: currentTotals.totalApiCalls,
    chatbotPerformance,
    recentActivity,
  };

  return {
    metrics,
    previousMetrics: {
      totalMessages: previousTotals.totalMessages,
      totalConversations: previousTotals.totalConversations,
      activeUsers: previousTotals.activeUsers.size,
    },
    series,
    chatbotPerformance,
    recentActivity,
  };
}
