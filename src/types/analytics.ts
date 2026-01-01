import type { DashboardMetrics } from "@/types/metrics";

export type AnalyticsSeriesPoint = {
  date: string;
  userMessages: number;
  botMessages: number;
  totalMessages: number;
  activeUsers: number;
  conversations: number;
};

export type AnalyticsOverview = {
  metrics: DashboardMetrics;
  previousMetrics: {
    totalMessages: number;
    totalConversations: number;
    activeUsers: number;
  };
  series: AnalyticsSeriesPoint[];
  chatbotPerformance: DashboardMetrics["chatbotPerformance"];
  recentActivity: DashboardMetrics["recentActivity"];
};
