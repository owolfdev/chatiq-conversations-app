// src/app/dashboard/admin/bots/[botId]/page.tsx

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AdminBotDetailsPageProps {
  params: Promise<{
    botId: string;
  }>;
}

export default async function AdminBotDetailsPage({
  params,
}: AdminBotDetailsPageProps) {
  const { botId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: currentProfile } = await supabase
    .from("bot_user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!currentProfile || currentProfile.role !== "admin") {
    redirect("/not-authorized");
  }

  const admin = createAdminClient();
  const { data: bot } = await admin
    .from("bot_bots")
    .select("id, name, slug, status, is_public, created_at, team_id, user_id")
    .eq("id", botId)
    .maybeSingle();

  if (!bot) {
    notFound();
  }

  const [
    { count: conversationCount },
    { count: documentCount },
    { count: messageCount },
    { data: lastActiveRow },
    ownerResult,
  ] = await Promise.all([
    admin
      .from("bot_conversations")
      .select("id", { count: "exact", head: true })
      .eq("bot_id", bot.id),
    admin
      .from("bot_documents")
      .select("id", { count: "exact", head: true })
      .eq("bot_id", bot.id),
    admin
      .from("bot_messages")
      .select("id, bot_conversations!inner(id)", {
        count: "exact",
        head: true,
      })
      .eq("bot_conversations.bot_id", bot.id),
    admin
      .from("bot_conversations")
      .select("created_at")
      .eq("bot_id", bot.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    bot.user_id
      ? admin
          .from("bot_user_profiles")
          .select("id, email, full_name")
          .eq("id", bot.user_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const lastActive = lastActiveRow?.created_at ?? null;
  const owner = ownerResult?.data ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Bot Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Usage summary and activity details for this bot
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link
              href={
                owner?.id
                  ? `/dashboard/admin/users/${owner.id}`
                  : "/dashboard/admin/users"
              }
            >
              Back to user
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-4 py-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-lg font-semibold">{bot.name}</div>
              <Badge variant="outline">{bot.status}</Badge>
              <Badge variant="secondary">
                {bot.is_public ? "Public" : "Private"}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {bot.slug ? `/${bot.slug}` : "No slug"}
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
              <span>
                Created: {new Date(bot.created_at).toLocaleDateString()}
              </span>
              <span>
                Last activity:{" "}
                {lastActive ? new Date(lastActive).toLocaleDateString() : "—"}
              </span>
              <span>Team ID: {bot.team_id}</span>
              <span>
                Owner:{" "}
                {owner ? `${owner.full_name || "Unnamed"} (${owner.email})` : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Conversations" value={conversationCount ?? 0} />
          <StatCard title="Messages" value={messageCount ?? 0} />
          <StatCard title="Documents" value={documentCount ?? 0} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
