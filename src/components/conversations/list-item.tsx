"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ConversationListItem } from "@/types/conversations";
import { getCustomerProfile } from "@/lib/conversations/get-customer-profile";
import { Trash2 } from "lucide-react";

interface ConversationListItemProps {
  conversation: ConversationListItem;
  onDelete: (conversationId: string) => void;
  onOpen: () => void;
  deleting?: boolean;
  opening?: boolean;
}

const formatTime = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatPreview = (value: string | null, fallback: string) => {
  const text = value?.trim() || fallback;
  if (!text) return "No messages yet.";
  if (text.length <= 160) return text;
  return `${text.slice(0, 160)}…`;
};

const getTopicTint = (topic: string) => {
  const normalized = topic.toLowerCase();
  if (
    normalized.includes("cancel") ||
    normalized.includes("complaint") ||
    normalized.includes("payment issue") ||
    normalized.includes("needs immediate attention")
  ) {
    return "border-red-200 bg-red-50 text-red-800";
  }
  if (normalized.includes("needs human")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (
    normalized.includes("booking inquiry") ||
    normalized.includes("availability hours") ||
    normalized.includes("order status") ||
    normalized.includes("pricing") ||
    normalized.includes("product inquiry")
  ) {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }
  if (normalized.includes("resolved")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (normalized.includes("greeting")) {
    return "border-border text-muted-foreground";
  }
  return "border-border text-muted-foreground";
};

export function ConversationListItemCard({
  conversation,
  onDelete,
  onOpen,
  deleting = false,
  opening = false,
}: ConversationListItemProps) {
  const lastSeen = conversation.last_message_at || conversation.created_at;
  const preview = formatPreview(
    conversation.topic_message_preview,
    conversation.title || "Conversation"
  );
  const customer = getCustomerProfile(conversation.source_detail);
  const name = customer?.name ?? "—";
  const avatarUrl = customer?.avatarUrl ?? null;
  const statusLabel =
    conversation.resolution_status === "resolved" ? "Resolved" : "Open";
  const statusClass =
    conversation.resolution_status === "resolved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-amber-200 bg-amber-50 text-amber-900";
  const topicLabel = conversation.topic || "General Inquiry";
  const topicTint = getTopicTint(topicLabel);
  const unreadCardClass = conversation.has_unread
    ? "border-amber-200 bg-amber-50/70 hover:border-amber-300 hover:bg-amber-100/70 dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:bg-amber-900/30"
    : "border-border bg-card hover:border-emerald-200";

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${unreadCardClass}`}
    >
      <div className="flex items-start gap-3">
        <Link
          href={`/conversations/${conversation.id}`}
          className="flex min-w-0 flex-1 items-start gap-3 transition-transform active:scale-[0.99]"
          onClick={() => {
            if (!opening) {
              onOpen();
            }
          }}
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={avatarUrl || undefined} alt={name} />
            <AvatarFallback>
              {name === "—" ? "—" : name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {conversation.has_unread ? (
                  <span
                    className="h-2 w-2 rounded-full bg-amber-500"
                    aria-label="Unread conversation"
                  />
                ) : null}
                <div className="truncate text-lg font-semibold">{name}</div>
                {opening ? (
                  <span className="text-xs text-muted-foreground">Opening...</span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`text-sm ${statusClass}`}>
                  {statusLabel}
                </Badge>
                {conversation.source ? (
                  <Badge
                    variant="outline"
                    className="text-sm capitalize text-muted-foreground"
                  >
                    {conversation.source}
                  </Badge>
                ) : null}
                <Badge variant="outline" className="text-sm text-muted-foreground">
                  {formatTime(lastSeen)}
                </Badge>
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="outline" className={`text-sm ${topicTint}`}>
                {topicLabel}
              </Badge>
            </div>
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {preview}
            </div>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete conversation"
          className="text-muted-foreground hover:text-destructive"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(conversation.id);
          }}
          disabled={deleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
