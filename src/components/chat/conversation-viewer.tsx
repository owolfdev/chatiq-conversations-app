// src/components/chat/conversation-viewer.tsx
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { MessageMarkdown } from "@/components/chat/message-markdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TOPIC_LABELS } from "@/lib/conversations/topic-classifier";

interface ConversationViewerProps {
  conversationId: string;
  botName: string;
  botDescription: string | null;
  messages: ChatMessage[];
  conversationTopic: string | null;
  createdAt: string;
  resolutionStatus?: "resolved" | "unresolved" | null;
  conversationSource?: string | null;
  customerName?: string | null;
  customerAvatarUrl?: string | null;
  customerStatus?: string | null;
  humanTakeover?: boolean;
  humanTakeoverUntil?: string | null;
  interactive?: boolean;
  backHref?: string;
}

export function ConversationViewer({
  conversationId,
  botName,
  messages,
  conversationTopic,
  resolutionStatus,
  conversationSource,
  customerName,
  customerAvatarUrl,
  humanTakeover = false,
  humanTakeoverUntil,
  interactive = false,
}: ConversationViewerProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [status, setStatus] = useState<"resolved" | "unresolved">(
    resolutionStatus ?? "unresolved"
  );
  const [topic, setTopic] = useState(conversationTopic || "General Inquiry");
  const [topicUpdating, setTopicUpdating] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages);
  const [takeoverEnabled, setTakeoverEnabled] = useState(humanTakeover);
  const [takeoverUntil, setTakeoverUntil] = useState<string | null>(
    humanTakeoverUntil ?? null
  );
  const [takeoverUpdating, setTakeoverUpdating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMessageCountRef = useRef(localMessages.length);
  const optimisticIdsRef = useRef<Set<string>>(new Set());
  const recentOptimisticRef = useRef<{
    content: string;
    role: ChatMessage["role"];
    createdAt: string;
  } | null>(null);

  const dedupeMessages = (items: ChatMessage[]) => {
    const seen = new Set<string>();
    const result: ChatMessage[] = [];
    for (const msg of items) {
      const timestamp = msg.createdAt ?? "";
      const key = msg.id
        ? `id:${msg.id}`
        : `${msg.role}|${timestamp}|${msg.content.trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(msg);
    }
    return result;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const displayCustomerName = customerName || "Customer";
  const botAvatarUrl = "/images/avatars/icon-512.jpg";
  const takeoverExpiry = takeoverUntil ? new Date(takeoverUntil) : null;
  const takeoverActive =
    takeoverEnabled &&
    (!takeoverExpiry || takeoverExpiry.getTime() > Date.now());
  const statusLabel = status === "resolved" ? "Resolved" : "Unresolved";
  const lastMessageAt =
    localMessages.length > 0
      ? localMessages[localMessages.length - 1]?.createdAt
      : null;
  const standalone = true;
  const sourceLabel = conversationSource || "Unknown source";

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    setTopic(conversationTopic || "General Inquiry");
  }, [conversationTopic]);

  useEffect(() => {
    if (!interactive) {
      return;
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [interactive, localMessages]);

  useEffect(() => {
    if (!interactive) {
      return;
    }
    const lastCount = lastMessageCountRef.current;
    const nextCount = localMessages.length;
    if (nextCount > lastCount) {
      const lastMessage = localMessages[localMessages.length - 1];
      if (lastMessage?.role === "user") {
        inputRef.current?.focus();
        if (status === "resolved") {
          setStatus("unresolved");
        }
      }
    }
    lastMessageCountRef.current = nextCount;
  }, [interactive, localMessages, status]);

  useEffect(() => {
    if (!interactive) {
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(`conversation:${conversationId}`);

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "bot_messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as {
          id?: string;
          sender?: string;
          content?: string;
          created_at?: string;
        };
        if (typeof row?.content !== "string" || !row.content) {
          return;
        }
        const content = row.content;
        if (row.id) {
          if (messageIdsRef.current.has(row.id)) {
            return;
          }
          messageIdsRef.current.add(row.id);
        }
        const role = row.sender === "bot" ? "assistant" : "user";
        if (role === "assistant" && typeof row.content === "string") {
          const optimistic = recentOptimisticRef.current;
          if (
            optimistic &&
            optimistic.role === role &&
            optimistic.content.trim() === row.content.trim() &&
            Math.abs(
              new Date(optimistic.createdAt).getTime() -
                new Date(row.created_at ?? 0).getTime()
            ) < 10_000
          ) {
            if (optimisticIdsRef.current.has(optimistic.createdAt)) {
              optimisticIdsRef.current.delete(optimistic.createdAt);
              setLocalMessages((prev) =>
                prev.filter((msg) => msg.createdAt !== optimistic.createdAt)
              );
            }
            return;
          }
        }
        setLocalMessages((prev) => {
          const exists = prev.some((msg) =>
            row.id
              ? msg.id === row.id
              : msg.role === role &&
                msg.content.trim() === row.content?.trim() &&
                msg.createdAt === row.created_at
          );
          if (exists) {
            return prev;
          }
          const next: ChatMessage[] = [
            ...prev,
            {
              id: row.id,
              role: role as ChatMessage["role"],
              content,
              createdAt: row.created_at,
            },
          ];
          return dedupeMessages(next);
        });
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "bot_conversations",
        filter: `id=eq.${conversationId}`,
      },
      (payload) => {
        const row = payload.new as {
          human_takeover?: boolean;
          human_takeover_until?: string | null;
        };
        if (typeof row.human_takeover === "boolean") {
          setTakeoverEnabled(row.human_takeover);
        }
        if ("human_takeover_until" in row) {
          setTakeoverUntil(row.human_takeover_until ?? null);
        }
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, interactive]);

  useEffect(() => {
    if (!interactive) {
      return;
    }

    let isMounted = true;
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages`,
          { credentials: "include" }
        );
        if (!response.ok) {
          return;
        }
        const payload = (await response.json().catch(() => null)) as {
          messages?: Array<{
            id: string;
            sender: string;
            content: string;
            created_at: string;
          }>;
        } | null;
        const rows = payload?.messages ?? [];
        if (!rows.length || !isMounted) {
          return;
        }
        messageIdsRef.current = new Set(rows.map((row) => row.id));
        const persisted: ChatMessage[] = rows.map((row) => ({
          id: row.id,
          role: (row.sender === "bot"
            ? "assistant"
            : "user") as ChatMessage["role"],
          content: row.content,
          createdAt: row.created_at,
        }));
        setLocalMessages((prev) => {
          const optimistic: ChatMessage[] = prev.filter((msg) =>
            msg.createdAt ? optimisticIdsRef.current.has(msg.createdAt) : false
          );
          const filteredOptimistic = optimistic.filter((msg) => {
            const matched = persisted.some(
              (row) =>
                row.role === msg.role &&
                row.content.trim() === msg.content.trim() &&
                row.createdAt &&
                msg.createdAt &&
                Math.abs(
                  new Date(row.createdAt).getTime() -
                    new Date(msg.createdAt).getTime()
                ) < 10_000
            );
            if (matched && msg.createdAt) {
              optimisticIdsRef.current.delete(msg.createdAt);
            }
            return !matched;
          });
          return dedupeMessages([...persisted, ...filteredOptimistic]);
        });
      } catch (error) {
        console.error("Failed to poll messages", error);
      }
    };

    fetchMessages();
    const interval = window.setInterval(fetchMessages, 5000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [conversationId, interactive]);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sending) {
      return;
    }
    const optimisticTimestamp = new Date().toISOString();
    optimisticIdsRef.current.add(optimisticTimestamp);
    recentOptimisticRef.current = {
      content: trimmed,
      role: "assistant",
      createdAt: optimisticTimestamp,
    };
    setSending(true);
    setDraft("");
    setLocalMessages((prev) => [
      ...prev,
      {
        id: `optimistic-${optimisticTimestamp}`,
        role: "assistant",
        content: trimmed,
        createdAt: optimisticTimestamp,
      },
    ]);
    try {
      const isLineConversation = conversationSource === "line";
      const response = await fetch(
        isLineConversation
          ? `/api/integrations/line/send`
          : `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(
            isLineConversation
              ? {
                  conversation_id: conversationId,
                  message: trimmed,
                }
              : {
                  content: trimmed,
                }
          ),
        }
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Failed to send message");
      }
      const payload = (await response.json().catch(() => null)) as {
        human_takeover_until?: string;
      } | null;
      if (payload?.human_takeover_until) {
        setTakeoverUntil(payload.human_takeover_until);
      }
      setTakeoverEnabled(true);
      inputRef.current?.focus();
    } catch (error) {
      console.error("Failed to send LINE message", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send message"
      );
      setDraft(trimmed);
      setLocalMessages((prev) =>
        prev.filter((msg) => msg.createdAt !== optimisticTimestamp)
      );
    } finally {
      setSending(false);
    }
  };

  const handleTakeoverToggle = async (enabled: boolean) => {
    setTakeoverUpdating(true);
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/takeover`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ enabled }),
        }
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Failed to update takeover");
      }
      const payload = (await response.json().catch(() => null)) as {
        enabled?: boolean;
        human_takeover_until?: string | null;
      } | null;
      setTakeoverEnabled(Boolean(payload?.enabled ?? enabled));
      if (enabled) {
        if (payload?.human_takeover_until) {
          setTakeoverUntil(payload.human_takeover_until);
        }
      } else {
        setTakeoverUntil(null);
      }
    } catch (error) {
      console.error("Failed to update takeover", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update takeover"
      );
    } finally {
      setTakeoverUpdating(false);
    }
  };

  const handleStatusToggle = async () => {
    const nextStatus = status === "resolved" ? "unresolved" : "resolved";
    setStatusUpdating(true);
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Failed to update status");
      }
      setStatus(nextStatus);
      toast.success(`Marked ${nextStatus}`);
    } catch (error) {
      console.error("Failed to update status", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update status"
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleTopicChange = async (nextTopic: string) => {
    if (nextTopic === topic || topicUpdating) return;
    const previous = topic;
    setTopic(nextTopic);
    setTopicUpdating(true);
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/topic`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ topic: nextTopic }),
        }
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Failed to update topic");
      }
      toast.success("Topic updated");
    } catch (error) {
      setTopic(previous);
      console.error("Failed to update topic", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update topic"
      );
    } finally {
      setTopicUpdating(false);
    }
  };

  return (
    <div className="w-full flex h-full flex-col min-h-0">
      <div className="shrink-0 bg-background border-b border-border shadow-sm">
        <div className="space-y-2 pb-2 px-4">
          <div className="flex items-start justify-between gap-3">
            <Button
              variant={takeoverActive ? "outline" : "default"}
              size="sm"
              onClick={() => handleTakeoverToggle(!takeoverActive)}
              disabled={takeoverUpdating || !standalone}
              aria-pressed={takeoverActive}
            >
              {takeoverUpdating
                ? "Switching..."
                : takeoverActive
                ? "Agent"
                : "Bot"}
            </Button>
            <div className="text-xs text-muted-foreground text-right flex flex-wrap items-center justify-end gap-2">
              <Badge variant="outline">{botName}</Badge>
              <Badge variant="outline" className="capitalize">
                {sourceLabel}
              </Badge>
              <div className="text-lg font-semibold text-foreground pl-3">
                {displayCustomerName}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStatusToggle}
                disabled={statusUpdating || !standalone}
                aria-pressed={status === "resolved"}
                className={cn(
                  status === "resolved"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                )}
              >
                {statusUpdating ? "Updating..." : statusLabel}
              </Button>
              <div className="min-w-[140px]">
                <Select
                  value={topic}
                  onValueChange={handleTopicChange}
                  disabled={topicUpdating || !standalone}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOPIC_LABELS.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-right space-y-1">
              <div>{localMessages.length} messages</div>
              <div>{lastMessageAt ? formatShortDate(lastMessageAt) : "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <Card className="bg-[var(--background)] border-0 rounded-none shadow-none py-0 flex-1 min-h-0">
        <CardContent className="pt-0 px-0 pb-0 h-full flex flex-col min-h-0">
          {interactive ? (
            <div className="h-full flex flex-col min-h-0">
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto flex flex-col gap-3 px-2 py-3"
              >
                {localMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No messages in this conversation
                  </div>
                ) : (
                  localMessages.map((msg, idx) => {
                    const isUser = msg.role === "user";
                    return (
                      <div
                        key={msg.id ?? msg.createdAt ?? idx}
                        className={cn("flex items-start gap-3", {
                          "justify-end": isUser,
                          "justify-start": !isUser,
                        })}
                      >
                        {!isUser && (
                          <Avatar className="hidden md:flex h-8 w-8">
                            <AvatarImage src={botAvatarUrl} alt={botName} />
                            <AvatarFallback>
                              {botName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2 text-lg md:text-xl shadow-sm",
                            isUser
                              ? "bg-white text-zinc-900"
                              : "bg-emerald-100 text-emerald-950"
                          )}
                        >
                          <div className="whitespace-pre-wrap break-words">
                            <MessageMarkdown content={msg.content} />
                          </div>
                          {msg.createdAt && (
                            <div
                              className={cn(
                                "hidden md:block text-xs mt-1 opacity-70",
                                "text-zinc-600"
                              )}
                            >
                              {formatDate(msg.createdAt)}
                            </div>
                          )}
                        </div>
                        {isUser && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={customerAvatarUrl || undefined}
                              alt={displayCustomerName}
                            />
                            <AvatarFallback>
                              {displayCustomerName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <form
                onSubmit={handleSend}
                className="border-t border-border pt-3 mt-0 flex items-center gap-2 shrink-0 bg-background px-4"
              >
                <Input
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Reply as human..."
                  disabled={sending || !standalone}
                />
                <Button
                  type="submit"
                  disabled={sending || !draft.trim() || !standalone}
                >
                  {sending ? "Sending..." : "Send"}
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-4 px-2">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages in this conversation
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={idx}
                      className={cn("flex items-start gap-3", {
                        "justify-end": isUser,
                        "justify-start": !isUser,
                      })}
                    >
                      {!isUser && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={botAvatarUrl} alt={botName} />
                          <AvatarFallback>
                            {botName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2 text-lg shadow-sm",
                          isUser
                            ? "bg-emerald-500/90 text-emerald-50"
                            : "bg-zinc-700/90 text-zinc-50"
                        )}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          <MessageMarkdown content={msg.content} />
                        </div>
                        {msg.createdAt && (
                          <div
                            className={cn(
                              "text-xs mt-1 opacity-70",
                              isUser ? "text-emerald-100" : "text-zinc-300"
                            )}
                          >
                            {formatDate(msg.createdAt)}
                          </div>
                        )}
                      </div>
                      {isUser && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={customerAvatarUrl || undefined}
                            alt={displayCustomerName}
                          />
                          <AvatarFallback>
                            {displayCustomerName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
