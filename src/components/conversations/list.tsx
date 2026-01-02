"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FiltersSheet } from "@/components/conversations/filters-sheet";
import { ConversationListItemCard } from "@/components/conversations/list-item";
import type { ConversationListItem } from "@/types/conversations";
import { CONVERSATION_SOURCE_OPTIONS } from "@/lib/conversations/source-options";
import { TOPIC_LABELS } from "@/lib/conversations/topic-classifier";
import { Filter, RefreshCcw } from "lucide-react";

interface ConversationsListProps {
  initialConversations: ConversationListItem[];
  initialBots: Array<{ id: string; name: string }>;
}

export function ConversationsList({
  initialConversations,
  initialBots,
}: ConversationsListProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedBot, setSelectedBot] = useState("all");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [userQuery, setUserQuery] = useState("");
  const [detailQuery, setDetailQuery] = useState("");
  const [debouncedUserQuery, setDebouncedUserQuery] = useState("");
  const [debouncedDetailQuery, setDebouncedDetailQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pollingRef = useRef<ReturnType<typeof globalThis.setInterval> | null>(
    null
  );

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
    const startPolling = () => {
      if (pollingRef.current !== null) {
        return;
      }
      pollingRef.current = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          loadConversations(true);
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
    } finally {
      setIsRefreshing(false);
    }
  };

  const resetFilters = () => {
    setSelectedBot("all");
    setSelectedTopic("all");
    setSelectedStatus("all");
    setSelectedSource("all");
    setUserQuery("");
    setDetailQuery("");
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search customer"
          value={userQuery}
          onChange={(event) => setUserQuery(event.target.value)}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open filters"
          onClick={() => setFiltersOpen(true)}
        >
          <Filter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh list"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCcw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-muted px-4 py-10 text-center text-sm text-muted-foreground">
            Loading conversations...
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
            />
          ))
        )}
      </div>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        {conversations.length} conversations
      </div>

      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        bots={initialBots}
        topics={TOPIC_LABELS}
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
