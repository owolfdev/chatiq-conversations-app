// src/app/dashboard/page.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  MessageSquare,
  FileText,
  Key,
  TrendingUp,
  Plus,
} from "lucide-react";
import Link from "next/link";

import { getDisplayName } from "@/lib/utils/get-display-name";
import { getUserBotsWithCounts } from "@/app/actions/bots/get-user-bots-with-counts";
import { getRecentConversations } from "@/app/actions/chat/get-recent-conversations";
import { RecentConversationsPanel } from "@/components/dashboard/conversations/recent-conversations";
import { getDashboardMetrics } from "@/app/actions/analytics/get-dashboard-metrics";
import { getUsageData } from "@/app/actions/dashboard/get-usage-data";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { FreeTierTrialBanner } from "@/components/dashboard/free-tier-trial-banner";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/sign-in?redirect=/dashboard");
  }

  const name = await getDisplayName();
  const botContext = await getUserBotsWithCounts();

  // Use team bots if viewing a team, otherwise use all bots (team + personal)
  const activeTeamId = botContext.team.id;
  const activeTeamName = botContext.team.name;
  const activeTeamCreatedAt = botContext.team.createdAt;
  const activeTeamTrialEndsAt = botContext.team.trialEndsAt;
  const bots = activeTeamId
    ? botContext.team.bots
    : [...botContext.team.bots, ...botContext.personal.bots];

  const recentConversations = await getRecentConversations(5, activeTeamId);
  const metrics = await getDashboardMetrics(activeTeamId);

  // Get usage data for the usage meter widget
  const usageData = await getUsageData();

  const fallbackTotalConversations = bots.reduce(
    (sum, bot) => sum + (bot.conversations ?? 0),
    0
  );
  const fallbackTotalDocuments = bots.reduce(
    (sum, bot) => sum + (bot.documents ?? 0),
    0
  );

  const totalBots = metrics.totalChatbots || bots.length;
  const totalConversations =
    metrics.totalConversations ?? fallbackTotalConversations;
  const totalDocuments = metrics.totalDocuments ?? fallbackTotalDocuments;
  const totalApiCalls = metrics.totalApiCalls ?? 0;

  const recentBots = bots.slice(0, 4); // latest first
  const isEmptyState =
    (totalBots ?? 0) === 0 &&
    (totalDocuments ?? 0) === 0 &&
    (totalConversations ?? 0) === 0;

  return (
    <div className="space-y-8 max-w-6xl w-full mx-auto overflow-x-hidden">
      {/* Free Tier Trial Banner */}
      <FreeTierTrialBanner
        teamCreatedAt={activeTeamCreatedAt ?? usageData.teamCreatedAt}
        teamTrialEndsAt={activeTeamTrialEndsAt ?? usageData.teamTrialEndsAt}
        currentPlan={usageData.currentPlan}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {name}!
          </h1>
          <p className="text-muted-foreground">
            {activeTeamName
              ? `Here's an overview of ${activeTeamName}.`
              : "Here's an overview of your chatbot platform."}
          </p>
          {activeTeamName && (
            <div className="mt-2">
              <Badge variant="outline" className="text-sm">
                {activeTeamName}
              </Badge>
            </div>
          )}
        </div>
        {isEmptyState ? (
          <Button
            asChild
            size="lg"
            className="h-12 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md self-start sm:self-auto"
          >
            <Link href="/dashboard/bots/new">
              <Bot className="h-5 w-5" />
              Create your first bot
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            className="bg-primary text-primary-foreground hover:bg-primary/90 self-start sm:self-auto"
          >
            <Link href="/dashboard/bots/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Bot
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 w-full">
        <div className="w-full">
          <Link href="/dashboard/bots" className="block h-full">
            <Card className="bg-muted border-border hover:border-primary/40 transition-colors h-full w-full overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Bots
                </CardTitle>
                <Bot className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBots}</div>
                <p className="text-xs text-muted-foreground">
                  {totalBots === 1 ? "Bot" : "Bots"}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card className="bg-muted border-border hover:border-primary/40 transition-colors w-full overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Conversations
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversations}</div>
            <p className="text-xs text-muted-foreground">Across all bots</p>
          </CardContent>
        </Card>

        <Card className="bg-muted border-border hover:border-primary/40 transition-colors w-full overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Linked and direct</p>
          </CardContent>
        </Card>

        <Card className="bg-muted border-border hover:border-primary/40 transition-colors w-full overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApiCalls}</div>
            <p className="text-xs text-muted-foreground">
              Total user prompts processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Meter Widget */}
      {usageData.quotaStatus && (
        <UsageMeter
          quotaStatus={usageData.quotaStatus}
          currentPlan={usageData.currentPlan}
          isTeamOwner={usageData.isTeamOwner}
          billingCurrency={usageData.billingCurrency}
          compact={true}
        />
      )}

      {/* Recent Bots */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-muted border-border">
          <CardHeader>
            <CardTitle>Recent Bots</CardTitle>
            <CardDescription>
              {activeTeamName
                ? `Most recently created chatbots in ${activeTeamName}`
                : "Your most recently created chatbots"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentBots.map((bot) => (
              <Link
                href={`/chat/${bot.slug}`}
                key={bot.id}
                className="block hover:bg-muted/50 rounded-lg px-2 py-1.5 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{bot.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {bot.conversations ?? 0} conversations
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={bot.status === "active" ? "default" : "outline"}
                    className="uppercase tracking-wide text-xs"
                  >
                    {bot.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-muted border-border">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get you started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start hover:border-primary/40 hover:text-primary"
              asChild
            >
              <a href="/dashboard/bots/new">
                <Bot className="mr-2 h-4 w-4" />
                Create New Bot
              </a>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start hover:border-primary/40 hover:text-primary"
              asChild
            >
              <Link href="/dashboard/documents">
                <FileText className="mr-2 h-4 w-4" />
                Manage Documents
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start hover:border-primary/40 hover:text-primary"
              asChild
            >
              <Link href="/dashboard/api-keys">
                <Key className="mr-2 h-4 w-4" />
                Generate API Key
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <RecentConversationsPanel conversations={recentConversations} />
    </div>
  );
}
