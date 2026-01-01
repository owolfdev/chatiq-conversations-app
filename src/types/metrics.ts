//src/types/metrics.ts
export type DashboardMetrics = {
  totalMessages: number;
  totalConversations: number;
  activeUsers: number;
  avgResponseTime: number;
  satisfactionRate: number;
  totalChatbots: number;
  monthlyGrowth: number;
  totalDocuments: number;
  totalApiCalls: number;
  chatbotPerformance: {
    name: string;
    messages: number;
    users: number;
    satisfaction: number;
    status: string;
  }[];
  recentActivity: {
    time: string;
    event: string;
    chatbot: string;
  }[];
};
