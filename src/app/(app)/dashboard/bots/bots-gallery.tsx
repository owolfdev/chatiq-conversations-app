// src/app/dashboard/bots/bots-gallery.tsx
"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bot as BotIcon,
  Plus,
  Search,
  ExternalLink,
  Settings,
  ArrowUpAZ,
  ArrowDownAZ,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import type { Bot } from "@/types/bot";
import { PublicBotLink } from "@/components/bots/public-bot-link";

type SortKey = "name" | "status" | "public" | "conversations";

type BotsGalleryProps = {
  teamName: string | null;
  teamBots: Bot[];
  personalBots: Bot[];
};

function filterAndSortBots(
  bots: Bot[],
  searchQuery: string,
  sortKey: SortKey,
  sortAsc: boolean
) {
  const q = searchQuery.toLowerCase();
  const searched = bots.filter(
    (bot) =>
      bot.name.toLowerCase().includes(q) ||
      bot.description?.toLowerCase().includes(q) ||
      bot.slug.toLowerCase().includes(q)
  );

  return [...searched].sort((a, b) => {
    switch (sortKey) {
      case "name": {
        const aVal = a.name.toLowerCase();
        const bVal = b.name.toLowerCase();
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      case "status": {
        const aVal = a.status?.toLowerCase() ?? "";
        const bVal = b.status?.toLowerCase() ?? "";
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      case "public": {
        const aVal = Number(a.is_public);
        const bVal = Number(b.is_public);
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      case "conversations": {
        const aVal = a.conversations ?? 0;
        const bVal = b.conversations ?? 0;
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      default:
        return 0;
    }
  });
}

export function BotCard({
  bot,
  showHeaderInfo = true,
}: {
  bot: Bot;
  showHeaderInfo?: boolean;
}) {
  return (
    <Card key={bot.id} className="flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {showHeaderInfo ? (
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <BotIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Link
                  href={`/chat/${bot.slug}`}
                  className="group inline-flex flex-col"
                >
                  <CardTitle className="text-lg group-hover:underline">
                    {bot.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground group-hover:text-primary">
                    /{bot.slug}
                  </p>
                </Link>
              </div>
            </div>
          ) : (
            <div />
          )}
        </div>
        {showHeaderInfo && (
          <CardDescription>
            {(() => {
              const words = bot.description?.split(/\s+/) ?? [];
              return words.length > 50
                ? words.slice(0, 50).join(" ") + "..."
                : bot.description;
            })()}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={bot.status === "active" ? "default" : "secondary"}>
              {bot.status}
            </Badge>
            {bot.is_public && <Badge variant="outline">Public</Badge>}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Sparkles
                  className={`h-4 w-4 ${
                    bot.llm_enabled !== false
                      ? "text-primary"
                      : "text-muted-foreground opacity-40"
                  }`}
                />
              </TooltipTrigger>
              <TooltipContent>
                {bot.llm_enabled !== false
                  ? "AI responses enabled"
                  : "AI responses disabled"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Conversations</p>
            <p className="font-medium">{bot.conversations}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Documents</p>
            <p className="font-medium">{bot.documents}</p>
          </div>
        </div>
        {bot.is_public && bot.status === "active" && (
          <div className="pt-2 flex flex-wrap gap-2">
            <PublicBotLink
              botSlug={bot.slug}
              isPublic={bot.is_public}
              status={bot.status}
              variant="compact"
              className="flex-1 min-w-[160px]"
            />
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-w-[160px]"
              asChild
            >
              <Link href={`/dashboard/bots/${bot.slug}/embed`}>
                <ExternalLink className="mr-2 h-3 w-3" /> Embed widget
              </Link>
            </Button>
          </div>
        )}
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/dashboard/bots/${bot.slug}`}>
              <ExternalLink className="mr-2 h-3 w-3" /> Test
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/dashboard/bots/${bot.slug}/settings`}>
              <Settings className="mr-2 h-3 w-3" /> Settings
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/dashboard/bots/${bot.slug}/tune`}>
              <SlidersHorizontal className="mr-2 h-3 w-3" /> Tune
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BotsSection({
  bots,
  emptyMessage,
}: {
  bots: Bot[];
  emptyMessage: string;
}) {
  return (
    <section className="space-y-4">
      {bots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function BotsGallery({
  teamName,
  teamBots,
  personalBots,
}: BotsGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const hasBots = (teamBots?.length ?? 0) + (personalBots?.length ?? 0) > 0;

  const filteredTeamBots = useMemo(
    () => filterAndSortBots(teamBots, searchQuery, sortKey, sortAsc),
    [teamBots, searchQuery, sortKey, sortAsc]
  );

  const filteredPersonalBots = useMemo(
    () => filterAndSortBots(personalBots, searchQuery, sortKey, sortAsc),
    [personalBots, searchQuery, sortKey, sortAsc]
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Bots</h1>
          <p className="text-muted-foreground">
            {teamName
              ? `Manage bots for ${teamName} and your personal workspace.`
              : "Manage your team and personal bots. Switch teams from the header to view different workspaces."}
          </p>
          {teamName && (
            <div className="mt-2">
              <Badge variant="outline" className="text-sm">
                {teamName}
              </Badge>
            </div>
          )}
        </div>
        {hasBots ? (
          <Button asChild>
            <Link href="/dashboard/bots/new">
              <Plus className="mr-2 h-4 w-4" /> Create Bot
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            size="lg"
            className="h-12 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
          >
            <Link href="/dashboard/bots/new">
              <BotIcon className="h-5 w-5" />
              Create your first bot
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bots..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort: {sortKey.charAt(0).toUpperCase() + sortKey.slice(1)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(["name", "status", "public", "conversations"] as SortKey[]).map(
                (key) => (
                  <DropdownMenuItem key={key} onClick={() => setSortKey(key)}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortAsc((s) => !s)}
          >
            {sortAsc ? (
              <ArrowUpAZ className="h-4 w-4" />
            ) : (
              <ArrowDownAZ className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <BotsSection
        bots={filteredTeamBots}
        emptyMessage={
          teamName
            ? `No bots in ${teamName} yet. Create a bot to get started, or invite teammates to collaborate.`
            : "No team bots yet. Switch teams from the header or create a bot to get started."
        }
      />

      <div className="border-t border-zinc-200 dark:border-zinc-800" />

      {/* <BotsSection
        title="Personal workspace"
        description="Your personal bots that are only visible to you. These bots are separate from your team workspace."
        bots={filteredPersonalBots}
        emptyMessage="You haven't created any personal bots yet. Use the Create Bot button to start experimenting in your personal workspace."
      /> */}
    </div>
  );
}
