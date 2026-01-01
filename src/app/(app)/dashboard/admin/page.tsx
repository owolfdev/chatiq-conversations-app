// src/app/dashboard/admin/page.tsx
import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
import { Mail, User, Bot, MessageSquare, DollarSign } from "lucide-react";
import { getAdminStats } from "@/app/actions/admin/get-admin-stats";
import { UnreadMessages } from "@/components/dashboard/messages/unread-messages";
import { getUnreadContactMessages } from "@/app/actions/contact/get-unread-contact-messages";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPanelPage() {
  const stats = await getAdminStats();
  // const messages = await getUnreadContactMessages();
  const { total } = await getUnreadContactMessages({ page: 1, limit: 1 });
  const showTestLinks =
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_TEST_ROUTES === "true";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">
            Platform-wide metrics and admin insights
          </p>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Unread Messages"
            value={total.toLocaleString()}
            icon={<Mail className="h-6 w-6 text-emerald-500" />}
          />
          <MetricCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={<User className="h-6 w-6 text-blue-500" />}
          />
          <MetricCard
            title="Total Bots"
            value={stats.totalBots.toLocaleString()}
            icon={<Bot className="h-6 w-6 text-orange-500" />}
          />
          <MetricCard
            title="Total Conversations"
            value={stats.totalConversations.toLocaleString()}
            icon={<MessageSquare className="h-6 w-6 text-purple-500" />}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Peak req/s is not tracked here; check Vercel logs/observability for real-time request rates.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin/stripe">Stripe Diagnostics</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin/users">User Directory</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link
              href="/dashboard/admin/costs"
              className="flex items-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Cost Monitoring
            </Link>
          </Button>
        </div>
        {showTestLinks ? (
          <div className="flex flex-wrap gap-3 rounded-lg border border-dashed p-3 text-sm">
            <span className="text-muted-foreground">Test routes:</span>
            <Button variant="outline" size="sm" asChild>
              <Link href="/__test/500?mode=throw">500 (throw)</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/__test/500?mode=response">500 (response)</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/__test/500-page">500 page</Link>
            </Button>
          </div>
        ) : null}

        <UnreadMessages />
      </main>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col justify-between gap-4">
        <div className="p-3 rounded-md bg-muted">{icon}</div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
