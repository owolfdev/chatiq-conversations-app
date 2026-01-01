"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, subDays, format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BarChart3, MessageSquare, TrendingUp, Users, Bot } from "lucide-react";
import type { AnalyticsOverview, AnalyticsSeriesPoint } from "@/types/analytics";

interface AnalyticsClientProps {
  initialOverview: AnalyticsOverview | null;
  teamName: string | null;
  initialStartDate: string;
  initialEndDate: string;
}

type RangeOption = "7d" | "30d" | "90d" | "custom";

function buildDateKeys(start: string, end: string) {
  const keys: string[] = [];
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  let cursor = startDate;

  while (cursor <= endDate) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor = addDays(cursor, 1);
  }

  return keys;
}

function emptyOverview(start: string, end: string): AnalyticsOverview {
  const dates = buildDateKeys(start, end);
  return {
    metrics: {
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
    },
    previousMetrics: {
      totalMessages: 0,
      totalConversations: 0,
      activeUsers: 0,
    },
    series: dates.map((date) => ({
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

function formatChange(current: number, previous: number) {
  if (!previous) return "—";
  const diff = ((current - previous) / previous) * 100;
  const rounded = Math.round(diff);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

export default function AnalyticsClient({
  initialOverview,
  teamName,
  initialStartDate,
  initialEndDate,
}: AnalyticsClientProps) {
  const [overview, setOverview] = useState<AnalyticsOverview>(
    initialOverview ?? emptyOverview(initialStartDate, initialEndDate)
  );
  const [range, setRange] = useState<RangeOption>("30d");
  const [customStart, setCustomStart] = useState(initialStartDate);
  const [customEnd, setCustomEnd] = useState(initialEndDate);
  const [currentStart, setCurrentStart] = useState(initialStartDate);
  const [currentEnd, setCurrentEnd] = useState(initialEndDate);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOverview = useCallback(async (start: string, end: string) => {
    if (start === currentStart && end === currentEnd) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ start, end });
      const response = await fetch(`/api/analytics/overview?${params}`);
      if (!response.ok) {
        throw new Error("Failed to load analytics");
      }
      const data = (await response.json()) as AnalyticsOverview;
      setOverview(data);
      setCurrentStart(start);
      setCurrentEnd(end);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [currentEnd, currentStart]);

  useEffect(() => {
    if (range === "custom") {
      if (customStart && customEnd && customStart <= customEnd) {
        fetchOverview(customStart, customEnd);
      }
      return;
    }

    const endDate = new Date();
    const startDate = subDays(
      endDate,
      range === "7d" ? 6 : range === "90d" ? 89 : 29
    );
    fetchOverview(
      startDate.toISOString().slice(0, 10),
      endDate.toISOString().slice(0, 10)
    );
  }, [range, customStart, customEnd, fetchOverview]);

  const stats = overview.metrics;
  const previous = overview.previousMetrics;

  const axisLabels = useMemo(() => {
    if (!overview.series.length) return [];
    const start = overview.series[0].date;
    const end = overview.series[overview.series.length - 1].date;
    const mid = overview.series[Math.floor(overview.series.length / 2)]?.date;
    return [start, mid, end].filter(Boolean) as string[];
  }, [overview.series]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {teamName
              ? `Monitor ${teamName}'s chatbot performance and user engagement.`
              : "Monitor your chatbot performance and user engagement. Switch teams from the header to view different workspaces."}
          </p>
          {teamName && (
            <div className="mt-2">
              <Badge variant="outline" className="text-sm">
                {teamName}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Select value={range} onValueChange={(value) => setRange(value as RangeOption)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          {range === "custom" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                className="w-40"
              />
              <Input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="w-40"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Total Conversations"
          value={stats.totalConversations.toLocaleString()}
          change={formatChange(stats.totalConversations, previous.totalConversations)}
          icon={<MessageSquare className="h-6 w-6 text-emerald-500" />}
        />
        <MetricCard
          title="Total Messages"
          value={stats.totalMessages.toLocaleString()}
          change={formatChange(stats.totalMessages, previous.totalMessages)}
          icon={<MessageSquare className="h-6 w-6 text-emerald-500" />}
        />
        <MetricCard
          title="Active Users"
          value={stats.activeUsers.toLocaleString()}
          change={formatChange(stats.activeUsers, previous.activeUsers)}
          icon={<Users className="h-6 w-6 text-blue-500" />}
        />
        <MetricCard
          title="Satisfaction Rate"
          value={stats.satisfactionRate ? `${stats.satisfactionRate}%` : "—"}
          change={null}
          icon={<TrendingUp className="h-6 w-6 text-green-500" />}
          note="Feedback collection not enabled yet"
        />
        <MetricCard
          title="Active Chatbots"
          value={stats.totalChatbots.toString()}
          change={null}
          icon={<Bot className="h-6 w-6 text-orange-500" />}
        />
        <MetricCard
          title="Monthly Growth"
          value={stats.monthlyGrowth ? `${stats.monthlyGrowth}%` : "—"}
          change={null}
          icon={<BarChart3 className="h-6 w-6 text-pink-500" />}
          note="Needs historical comparison"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Message Volume</CardTitle>
            <CardDescription>Daily message count over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer isLoading={isLoading}>
              <StackedBarChart data={overview.series} />
              <ChartAxis labels={axisLabels} />
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Engagement</CardTitle>
            <CardDescription>User activity and retention metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer isLoading={isLoading}>
              <SingleBarChart data={overview.series} />
              <ChartAxis labels={axisLabels} />
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chatbot Performance</CardTitle>
          <CardDescription>Individual chatbot metrics and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          {overview.chatbotPerformance.length === 0 ? (
            <EmptyState
              icon={<Bot className="h-12 w-12" />}
              title="No chatbot activity yet"
              description="Once chats start flowing, performance stats will appear here."
            />
          ) : (
            <div className="space-y-4">
              {overview.chatbotPerformance.map((chatbot) => (
                <div
                  key={chatbot.name}
                  className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Bot className="h-8 w-8 text-emerald-500" />
                    <div>
                      <p className="font-medium">{chatbot.name}</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {chatbot.messages.toLocaleString()} messages • {chatbot.users} users
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {chatbot.satisfaction ? `${chatbot.satisfaction}% satisfaction` : "Satisfaction: —"}
                    </p>
                    <Badge variant={chatbot.status === "active" ? "default" : "secondary"}>
                      {chatbot.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest events and interactions across your chatbots</CardDescription>
        </CardHeader>
        <CardContent>
          {overview.recentActivity.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-12 w-12" />}
              title="No recent activity"
              description="Recent events will appear once users start chatting."
            />
          ) : (
            <div className="space-y-4">
              {overview.recentActivity.map((activity) => (
                <div
                  key={`${activity.event}-${activity.time}-${activity.chatbot}`}
                  className="flex items-center gap-3 rounded-lg border-l-2 border-emerald-500 bg-emerald-50 p-3 dark:bg-emerald-950"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.event}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {activity.chatbot} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  change,
  icon,
  note,
}: {
  title: string;
  value: string;
  change: string | null;
  icon: React.ReactNode;
  note?: string;
}) {
  const changeClass =
    change && change.startsWith("-") ? "text-red-600" : "text-green-600";

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {title}
            </p>
            <p className="text-2xl font-bold">{value}</p>
            {change ? (
              <p className={`text-sm ${changeClass}`}>
                {change} from last period
              </p>
            ) : null}
            {note ? (
              <p className="text-xs text-zinc-500 mt-1 italic">{note}</p>
            ) : null}
          </div>
          <div className="p-3 bg-zinc-100 rounded-lg dark:bg-zinc-800">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartContainer({
  children,
  isLoading,
}: {
  children: React.ReactNode;
  isLoading: boolean;
}) {
  return (
    <div className="relative h-64 rounded-lg bg-zinc-50 px-4 py-4 dark:bg-zinc-800">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
          Loading analytics...
        </div>
      ) : null}
      {children}
    </div>
  );
}

function ChartAxis({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  return (
    <div className="mt-3 flex justify-between text-xs text-zinc-500">
      {labels.map((label) => (
        <span key={label}>{format(new Date(`${label}T00:00:00Z`), "MMM d")}</span>
      ))}
    </div>
  );
}

function StackedBarChart({ data }: { data: AnalyticsSeriesPoint[] }) {
  const maxValue = Math.max(0, ...data.map((item) => item.totalMessages));

  if (!maxValue) {
    return (
      <EmptyChart
        title="No messages yet"
        description="Message volume will appear once users start chatting."
      />
    );
  }

  return (
    <div className="flex h-44 items-end gap-1">
      {data.map((point) => {
        const userHeight = (point.userMessages / maxValue) * 100;
        const botHeight = (point.botMessages / maxValue) * 100;
        return (
          <div
            key={point.date}
            className="flex h-full flex-1 flex-col justify-end gap-0.5"
          >
            <div
              className="w-full rounded-sm bg-emerald-400"
              style={{ height: `${botHeight}%` }}
            />
            <div
              className="w-full rounded-sm bg-emerald-200"
              style={{ height: `${userHeight}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function SingleBarChart({ data }: { data: AnalyticsSeriesPoint[] }) {
  const maxValue = Math.max(0, ...data.map((item) => item.activeUsers));

  if (!maxValue) {
    return (
      <EmptyChart
        title="No active users yet"
        description="User engagement metrics will populate once users chat."
      />
    );
  }

  return (
    <div className="flex h-44 items-end gap-1">
      {data.map((point) => {
        const height = (point.activeUsers / maxValue) * 100;
        return (
          <div key={point.date} className="flex h-full flex-1 items-end">
            <div
              className="w-full rounded-sm bg-blue-400"
              style={{ height: `${height}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function EmptyChart({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-44 flex-col items-center justify-center gap-2 text-center text-zinc-500">
      <BarChart3 className="h-10 w-10" />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs">{description}</p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-12 text-zinc-500">
      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center">
        {icon}
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs mt-2">{description}</p>
    </div>
  );
}
