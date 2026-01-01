// src/app/dashboard/bots/[slug]/page.tsx
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import type { Bot } from "@/types/bot";
import Chat from "@/components/chat/chat";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import {
  CheckCircle2,
  Code2,
  ExternalLink,
  Globe,
  Settings,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { PublicBotLink } from "@/components/bots/public-bot-link";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string }>;
};

export default async function BotPreviewPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const { slug } = await params;
  const search = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: bot, error } = await supabase
    .from("bot_bots")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!bot || error) {
    notFound();
  }

  // Check team membership or ownership
  const { data: membership } = await supabase
    .from("bot_team_members")
    .select("id")
    .eq("team_id", bot.team_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: team } = await supabase
    .from("bot_teams")
    .select("owner_id")
    .eq("id", bot.team_id)
    .maybeSingle();

  const isTeamMember = !!membership || team?.owner_id === user.id;
  if (!isTeamMember) {
    notFound();
  }

  const [
    { count: directDocCount },
    { count: linkedDocCount },
    { count: conversationCount },
  ] = await Promise.all([
    supabase
      .from("bot_documents")
      .select("id", { count: "exact", head: true })
      .eq("bot_id", bot.id),
    supabase
      .from("bot_document_links")
      .select("document_id", { count: "exact", head: true })
      .eq("bot_id", bot.id),
    supabase
      .from("bot_conversations")
      .select("id", { count: "exact", head: true })
      .eq("bot_id", bot.id),
  ]);

  const botData: Bot = {
    ...(bot as Bot),
    conversations: conversationCount ?? 0,
    documents: (directDocCount ?? 0) + (linkedDocCount ?? 0),
    messages: (bot as Bot).messages ?? 0,
  };
  const showSuccess =
    search?.success === "1" || search?.success?.toLowerCase() === "true";

  return (
    <main>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {showSuccess && (
          <Alert className="border-primary/40 bg-primary/5 flex flex-col gap-4">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <AlertTitle className="flex items-center gap-2 text-base font-semibold text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  Bot created successfully
                </AlertTitle>
                <AlertDescription className="text-sm text-muted-foreground">
                  Your bot is live and ready to share, or embed on your site.
                  You can test your bot here below on this page.
                </AlertDescription>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <Button className="w-full sm:w-auto" asChild>
                  <Link
                    href={`https://bot.chatiq.io/${botData.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    Public bot link
                  </Link>
                </Button>
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <Link href={`/dashboard/bots/${botData.slug}/embed`}>
                    <Code2 className="mr-2 h-4 w-4" />
                    Embed link
                  </Link>
                </Button>
              </div>
            </div>
          </Alert>
        )}
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-primary">Test</p>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold">{botData.name}</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Sparkles
                    className={`h-5 w-5 ${
                      botData.llm_enabled !== false
                        ? "text-primary"
                        : "text-muted-foreground opacity-40"
                    }`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {botData.llm_enabled !== false
                    ? "AI responses enabled"
                    : "AI responses disabled"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {botData.description && (
            <p className="text-base text-muted-foreground">
              {botData.description}
            </p>
          )}
        </div>

        <div className="hidden md:flex flex-col gap-6">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Test this bot</h2>
            <p className="text-sm text-muted-foreground pb-3">
              Try a few prompts here to verify your latest changes. This test
              area uses the live bot configuration.
            </p>
            <div className="rounded-lg mt-3 md:mt-4 mb-3 md:mb-4">
              <Chat
                botSlug={botData.slug}
                initialMessages={undefined}
                initialConversationId={null}
                isInternal={isTeamMember}
                initialPrivateMode
                hidePrivacyToggle
                compact
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant={botData.status === "active" ? "default" : "secondary"}
            >
              {botData.status}
            </Badge>
            {botData.is_public && <Badge variant="outline">Public</Badge>}
            <Badge variant="secondary">/{botData.slug}</Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Sparkles
                    className={`h-4 w-4 ${
                      botData.llm_enabled !== false
                        ? "text-primary"
                        : "text-muted-foreground opacity-40"
                    }`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {botData.llm_enabled !== false
                    ? "AI responses enabled"
                    : "AI responses disabled"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Conversations</p>
              <p className="font-medium">{botData.conversations ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Documents</p>
              <p className="font-medium">{botData.documents ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Visibility</p>
              <p className="font-medium">
                {botData.is_public ? "Public" : "Private"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{botData.status}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-w-[160px]"
              asChild
            >
              <Link href={`/dashboard/bots/${botData.slug}/settings`}>
                <Settings className="mr-2 h-3 w-3" /> Settings
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-w-[160px]"
              asChild
            >
              <Link href={`/dashboard/bots/${botData.slug}/tune`}>
                <SlidersHorizontal className="mr-2 h-3 w-3" /> Tune
              </Link>
            </Button>
          </div>

          {botData.is_public && (
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <p className="text-sm font-medium">Embed this bot on your site</p>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="min-w-[150px]"
              >
                <Link href={`/dashboard/bots/${botData.slug}/embed`}>
                  <ExternalLink className="mr-2 h-3 w-3" /> Embed widget
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Grab the script tag and drop it into your site to add the
                widget. Use domain restrictions in the embed page to keep keys
                safe.
              </p>
            </div>
          )}

          {botData.is_public && (
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <PublicBotLink
                botSlug={botData.slug}
                isPublic={botData.is_public}
                status={botData.status ?? "active"}
              />
            </div>
          )}

          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <p className="text-sm font-medium">Internal chat link</p>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="min-w-[150px]"
            >
              <Link href={`/chat/${botData.slug}`}>
                <ExternalLink className="mr-2 h-3 w-3" /> Open internal chat
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              This link is for your team and logged-in users. Use it to test the
              bot without the public embed.
            </p>
          </div>
        </div>

        <div className="space-y-4 md:hidden">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Test this bot</h2>
            <p className="text-sm text-muted-foreground">
              Try a few prompts here to verify your latest changes.
            </p>
            <div className="mt-4 mb-3">
              <Chat
                botSlug={botData.slug}
                initialMessages={undefined}
                initialConversationId={null}
                isInternal={isTeamMember}
                initialPrivateMode
                hidePrivacyToggle
                compact
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={botData.status === "active" ? "default" : "secondary"}
            >
              {botData.status}
            </Badge>
            {botData.is_public && <Badge variant="outline">Public</Badge>}
            <Badge variant="secondary">/{botData.slug}</Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Sparkles
                    className={`h-4 w-4 ${
                      botData.llm_enabled !== false
                        ? "text-primary"
                        : "text-muted-foreground opacity-40"
                    }`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {botData.llm_enabled !== false
                    ? "AI responses enabled"
                    : "AI responses disabled"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Conversations</p>
              <p className="font-medium">{botData.conversations ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Documents</p>
              <p className="font-medium">{botData.documents ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Visibility</p>
              <p className="font-medium">
                {botData.is_public ? "Public" : "Private"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{botData.status}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/bots/${botData.slug}/settings`}>
                <Settings className="mr-2 h-3 w-3" /> Settings
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/bots/${botData.slug}/tune`}>
                <SlidersHorizontal className="mr-2 h-3 w-3" /> Tune
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/bots/${botData.slug}/embed`}>
                <ExternalLink className="mr-2 h-3 w-3" /> Embed widget
              </Link>
            </Button>
          </div>

          {botData.is_public && (
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Embed this bot on your site</p>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href={`/dashboard/bots/${botData.slug}/embed`}>
                  <ExternalLink className="mr-2 h-3 w-3" /> Embed widget
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Grab the script tag and drop it into your site to add the
                widget.
              </p>
            </div>
          )}

          {botData.is_public && (
            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <PublicBotLink
                botSlug={botData.slug}
                isPublic={botData.is_public}
                status={botData.status ?? "active"}
              />
            </div>
          )}

          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <p className="text-sm font-medium">Internal chat link</p>
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href={`/chat/${botData.slug}`}>
                <ExternalLink className="mr-2 h-3 w-3" /> Open internal chat
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Team-only chat experience for testing and internal use.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
