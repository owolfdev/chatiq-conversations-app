"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FiltersSheet } from "@/components/conversations/filters-sheet";
import { ConversationBookingSummaryStrip } from "@/components/conversations/booking-summary-strip";
import { StowableStatsPanel } from "@/components/inbox/stowable-stats-panel";
import { ConversationListItemCard } from "@/components/conversations/list-item";
import type { ConversationListItem } from "@/types/conversations";
import type { InboxCounts } from "@/types/inbox";
import { CONVERSATION_SOURCE_OPTIONS } from "@/lib/conversations/source-options";
import {
  getTopicBadgeClass,
  getTopicShortLabel,
} from "@/lib/conversations/topic-display";
import {
  HOME_TOPIC_SHORTCUTS,
  homeShortcutCanonicalTopic,
} from "@/lib/conversations/home-topic-shortcuts";
import { BarChart3, Filter, FilterX, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { deleteConversation } from "@/app/actions/chat/delete-conversation";
import { dispatchInboxCounts } from "@/lib/inbox-counts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const ACTIVE_TEAM_EVENT = "active-team-changed";
const CONVERSATION_STATS_STORAGE_KEY = "chatiq-inbox.stow.conversationStats";
const CONVERSATION_STATS_PANEL_ID = "chatiq-inbox-conversation-stats-panel";

interface ConversationsListProps {
  initialConversations: ConversationListItem[];
  initialBots: Array<{ id: string; name: string }>;
}

export function ConversationsList({
  initialConversations,
  initialBots,
}: ConversationsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [standalone, setStandalone] = useState<boolean | null>(null);
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedBot, setSelectedBot] = useState(() => {
    const b = searchParams.get("botId") ?? searchParams.get("bot");
    return b?.trim() ? b.trim() : "all";
  });
  const [selectedTopic, setSelectedTopic] = useState(() => {
    const t = searchParams.get("topic")?.trim();
    return t && t.length > 0 ? t : "all";
  });
  const [selectedStatus, setSelectedStatus] = useState(() => {
    const s = searchParams.get("status")?.trim();
    return s && s.length > 0 ? s : "all";
  });
  const [selectedSource, setSelectedSource] = useState(() => {
    const s = searchParams.get("source")?.trim();
    return s && s.length > 0 ? s : "all";
  });
  const [userQuery, setUserQuery] = useState("");
  const [detailQuery, setDetailQuery] = useState("");
  const [debouncedUserQuery, setDebouncedUserQuery] = useState("");
  const [debouncedDetailQuery, setDebouncedDetailQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);
  const [inboxCounts, setInboxCounts] = useState<InboxCounts | null>(null);
  const [statsPanelOpen, setStatsPanelOpen] = useState(false);
  const [statsStorageHydrated, setStatsStorageHydrated] = useState(false);

  const sourceOptions = useMemo(() => {
    const available = Array.from(
      new Set(conversations.map((conv) => conv.source).filter(Boolean))
    )
      .filter(
        (source) =>
          !CONVERSATION_SOURCE_OPTIONS.some((option) => option.value === source)
      )
      .map((source) => ({
        value: source as string,
        label: source as string,
      }));
    return [...CONVERSATION_SOURCE_OPTIONS, ...available];
  }, [conversations]);

  const topicOptions = useMemo(() => {
    const fromConversations = Array.from(
      new Set(
        conversations
          .map((conversation) =>
            typeof conversation.topic === "string"
              ? conversation.topic.trim()
              : ""
          )
          .filter((topic) => topic.length > 0)
      )
    );
    if (selectedTopic !== "all" && !fromConversations.includes(selectedTopic)) {
      return [selectedTopic, ...fromConversations];
    }
    return fromConversations;
  }, [conversations, selectedTopic]);

  const loadConversations = useCallback(async (silent = false) => {
    const params = new URLSearchParams();
    params.set("limit", "50");
    params.set("sortBy", "last_message_at");
    params.set("sortDir", "desc");
    if (selectedBot !== "all") {
      params.set("botId", selectedBot);
    }
    if (selectedTopic !== "all") {
      params.set("topic", selectedTopic);
    }
    if (selectedStatus !== "all") {
      params.set("status", selectedStatus);
    }
    if (selectedSource !== "all") {
      params.set("source", selectedSource);
    }
    if (debouncedUserQuery.trim()) {
      params.set("userQuery", debouncedUserQuery.trim());
    }
    if (debouncedDetailQuery.trim()) {
      params.set("detailQuery", debouncedDetailQuery.trim());
    }
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const response = await fetch(`/api/conversations?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch conversations.");
      }
      const payload = (await response.json().catch(() => null)) as {
        conversations?: ConversationListItem[];
      } | null;
      setConversations(payload?.conversations ?? []);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [
    selectedBot,
    selectedTopic,
    selectedStatus,
    selectedSource,
    debouncedUserQuery,
    debouncedDetailQuery,
  ]);

  const loadCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/inbox-counts", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json().catch(() => null)) as
        | InboxCounts
        | null;
      if (!payload) {
        return;
      }
      setInboxCounts(payload);
      dispatchInboxCounts(payload);
    } catch (error) {
      console.error("Failed to load inbox counts", error);
    }
  }, []);

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
    const isIosStandalone = "standalone" in navigator && (navigator as any).standalone;
    setStandalone(Boolean(isStandalone || isIosStandalone));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CONVERSATION_STATS_STORAGE_KEY);
      if (raw === "1") setStatsPanelOpen(true);
    } finally {
      setStatsStorageHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!statsStorageHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(
      CONVERSATION_STATS_STORAGE_KEY,
      statsPanelOpen ? "1" : "0"
    );
  }, [statsPanelOpen, statsStorageHydrated]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedUserQuery(userQuery);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [userQuery]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedDetailQuery(detailQuery);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [detailQuery]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    const startPolling = () => {
      if (pollingRef.current !== null) {
        return;
      }
      pollingRef.current = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          loadConversations(true);
          loadCounts();
        }
      }, 8000);
    };

    const stopPolling = () => {
      if (pollingRef.current !== null) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadConversations(true);
        loadCounts();
        startPolling();
      } else {
        stopPolling();
      }
    };

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadConversations]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadConversations(true);
      await loadCounts();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (deletingId) return;
    setDeletingId(conversationId);
    try {
      await deleteConversation(conversationId);
      setConversations((prev) =>
        prev.filter((conversation) => conversation.id !== conversationId)
      );
      toast.success("Conversation deleted.");
    } catch (error) {
      console.error("Failed to delete conversation", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete conversation"
      );
    } finally {
      setDeletingId(null);
    }
  };
  const handleRequestDelete = (conversationId: string) => {
    setPendingDeleteId(conversationId);
    setConfirmOpen(true);
  };

  const pendingConversation = pendingDeleteId
    ? conversations.find((conversation) => conversation.id === pendingDeleteId)
    : null;

  useEffect(() => {
    const handleTeamChange = () => {
      handleRefresh();
    };

    window.addEventListener(ACTIVE_TEAM_EVENT, handleTeamChange);
    return () => {
      window.removeEventListener(ACTIVE_TEAM_EVENT, handleTeamChange);
    };
  }, [handleRefresh]);

  const resetFilters = () => {
    setSelectedBot("all");
    setSelectedTopic("all");
    setSelectedStatus("all");
    setSelectedSource("all");
    setUserQuery("");
    setDetailQuery("");
    router.replace("/conversations", { scroll: false });
  };

  /** Preserve bot/status/source when jumping to a topic (search stays client-only). */
  const buildListHref = useCallback(
    (topic: string | null) => {
      const p = new URLSearchParams();
      if (selectedBot !== "all") {
        p.set("botId", selectedBot);
      }
      if (topic?.trim()) {
        p.set("topic", topic.trim());
      }
      if (selectedStatus !== "all") {
        p.set("status", selectedStatus);
      }
      if (selectedSource !== "all") {
        p.set("source", selectedSource);
      }
      const qs = p.toString();
      return qs ? `/conversations?${qs}` : "/conversations";
    },
    [selectedBot, selectedStatus, selectedSource]
  );

  const openCount = inboxCounts?.openConversations ?? 0;
  const topicShortcutCounts = inboxCounts?.topicShortcutCounts ?? {};
  const pendingBookingsCount = inboxCounts?.pendingBookings ?? 0;
  const upcomingBookingsCount = inboxCounts?.upcomingConfirmedBookings ?? 0;
  const needsScheduleCount = inboxCounts?.unscheduledBookings ?? 0;
  const linkedConversationCount = conversations.filter(
    (conversation) => conversation.booking_context?.total
  ).length;

  const hasActiveFilters = useMemo(() => {
    return (
      selectedBot !== "all" ||
      selectedTopic !== "all" ||
      selectedStatus !== "all" ||
      selectedSource !== "all" ||
      userQuery.trim().length > 0 ||
      detailQuery.trim().length > 0
    );
  }, [
    selectedBot,
    selectedTopic,
    selectedStatus,
    selectedSource,
    userQuery,
    detailQuery,
  ]);

  const visibleTopicShortcuts = useMemo(() => {
    return HOME_TOPIC_SHORTCUTS.filter((shortcut) => {
      const count = topicShortcutCounts[shortcut.id] ?? 0;
      const isActive = shortcut.matchTopics.includes(selectedTopic);
      return count > 0 || isActive;
    });
  }, [topicShortcutCounts, selectedTopic]);

  const activeServerFilters = useMemo(() => {
    const parts: string[] = [];
    if (selectedTopic !== "all") {
      parts.push(`Topic: ${getTopicShortLabel(selectedTopic)}`);
    }
    if (selectedBot !== "all") {
      const bot = initialBots.find((b) => b.id === selectedBot);
      parts.push(`Bot: ${bot?.name ?? selectedBot}`);
    }
    if (selectedStatus !== "all") {
      parts.push(`Status: ${selectedStatus}`);
    }
    if (selectedSource !== "all") {
      parts.push(`Source: ${selectedSource}`);
    }
    if (debouncedUserQuery.trim()) {
      parts.push("Customer search");
    }
    if (debouncedDetailQuery.trim()) {
      parts.push("Detail search");
    }
    return parts;
  }, [
    selectedTopic,
    selectedBot,
    selectedStatus,
    selectedSource,
    debouncedUserQuery,
    debouncedDetailQuery,
    initialBots,
  ]);

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-4 pb-10 pt-4">
      {standalone === false ? (
        <div className="mb-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">ChatIQ Inbox is a PWA.</span>{" "}
          Install it to run like a native app with the best performance and
          offline-friendly behavior.{" "}
          <Link
            href="/install"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            View install steps
          </Link>
          .
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Conversation stats"
          aria-expanded={statsPanelOpen}
          aria-controls={CONVERSATION_STATS_PANEL_ID}
          onClick={() => setStatsPanelOpen((prev) => !prev)}
          className={cn(
            "shrink-0",
            statsPanelOpen && "bg-muted text-foreground"
          )}
        >
          <BarChart3 className="h-5 w-5" aria-hidden />
        </Button>
        <Input
          className="min-w-0 flex-1"
          placeholder="Search customer"
          value={userQuery}
          onChange={(event) => setUserQuery(event.target.value)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Open filters"
          onClick={() => setFiltersOpen(true)}
        >
          <Filter className="h-5 w-5" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Reset filters"
          disabled={!hasActiveFilters}
          onClick={resetFilters}
        >
          <FilterX className="h-5 w-5" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Refresh list"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCcw
            className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
            style={isRefreshing ? { animationDirection: "reverse" } : undefined}
            aria-hidden
          />
        </Button>
      </div>

      {activeServerFilters.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Active filters</span>{" "}
          (applied on server): {activeServerFilters.join(" · ")}
        </p>
      ) : null}

      <StowableStatsPanel
        title="Conversation stats"
        hideHeaderTrigger
        open={statsPanelOpen}
        onOpenChange={setStatsPanelOpen}
        panelId={CONVERSATION_STATS_PANEL_ID}
      >
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Quick topic filters
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildListHref(null)}
              scroll={false}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                selectedTopic === "all"
                  ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/35"
                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              All topics
            </Link>
            {visibleTopicShortcuts.map((shortcut) => {
              const canonical = homeShortcutCanonicalTopic(shortcut);
              const count = topicShortcutCounts[shortcut.id] ?? 0;
              const isActive = shortcut.matchTopics.includes(selectedTopic);
              return (
                <Link
                  key={shortcut.id}
                  href={buildListHref(canonical)}
                  scroll={false}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    getTopicBadgeClass(canonical),
                    isActive &&
                      "ring-2 ring-primary/45 ring-offset-2 ring-offset-background"
                  )}
                >
                  <span>{shortcut.displayLabel}</span>
                  <span
                    className="tabular-nums opacity-80"
                    aria-label={`${count} conversations`}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
        <ConversationBookingSummaryStrip
          openCount={openCount}
          upcomingBookingsCount={upcomingBookingsCount}
          pendingBookingsCount={pendingBookingsCount}
          needsScheduleCount={needsScheduleCount}
          linkedConversationCount={linkedConversationCount}
        />
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {openCount > 0 ? (
            <>
              <span className="font-medium text-foreground">{openCount}</span>{" "}
              open conversation
              {openCount === 1 ? "" : "s"} team-wide (not limited to this
              list).{" "}
            </>
          ) : null}
          This list loads up to <span className="font-medium text-foreground">50</span>{" "}
          threads per refresh, newest first. Topic filters run on the server.
        </p>
      </StowableStatsPanel>

      <div className="mt-6 flex-1 min-h-0 space-y-4 overflow-y-auto pb-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border bg-card px-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted px-4 py-10 text-center text-sm text-muted-foreground">
            No conversations found.
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationListItemCard
              key={conversation.id}
              conversation={conversation}
              deleting={deletingId === conversation.id}
              opening={openingId === conversation.id}
              onOpen={() => setOpeningId(conversation.id)}
              onDelete={handleRequestDelete}
            />
          ))
        )}
      </div>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        {conversations.length} conversations
      </div>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setPendingDeleteId(null);
          }
          setConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingConversation
                ? `This will permanently delete the conversation with ${pendingConversation.title || "the selected user"}.`
                : "This will permanently delete the selected conversation."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingDeleteId) return;
                handleDeleteConversation(pendingDeleteId);
                setConfirmOpen(false);
              }}
              disabled={!pendingDeleteId || Boolean(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        bots={initialBots}
        topics={topicOptions}
        sources={sourceOptions}
        selectedBot={selectedBot}
        onBotChange={setSelectedBot}
        selectedTopic={selectedTopic}
        onTopicChange={setSelectedTopic}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedSource={selectedSource}
        onSourceChange={setSelectedSource}
        detailQuery={detailQuery}
        onDetailQueryChange={setDetailQuery}
        onReset={resetFilters}
      />
    </div>
  );
}
