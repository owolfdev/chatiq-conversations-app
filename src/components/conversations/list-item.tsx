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
    return "bg-red-500";
  }
  if (normalized.includes("needs human")) {
    return "bg-amber-500";
  }
  if (
    normalized.includes("booking inquiry") ||
    normalized.includes("availability hours") ||
    normalized.includes("order status") ||
    normalized.includes("pricing") ||
    normalized.includes("product inquiry")
  ) {
    return "bg-blue-500";
  }
  if (normalized.includes("resolved")) {
    return "bg-emerald-500";
  }
  if (normalized.includes("greeting")) {
    return "bg-slate-400";
  }
  return "bg-slate-400";
};

export function ConversationListItemCard({
  conversation,
  onDelete,
  onOpen,
  deleting = false,
  opening = false,
}: ConversationListItemProps) {
  const preview = formatPreview(
    conversation.topic_message_preview,
    conversation.title || "Conversation"
  );
  const customer = getCustomerProfile(conversation.source_detail);
  const name = customer?.name?.trim() || conversation.bot_name || "—";
  const avatarUrl = customer?.avatarUrl ?? null;
  const statusLabel = conversation.resolution_status === "resolved" ? "Resolved" : "Open";
  const statusDotClass =
    conversation.resolution_status === "resolved"
      ? "bg-emerald-500"
      : "bg-amber-500";
  const topicLabel = conversation.topic || "General Inquiry";
  const topicTint = getTopicTint(topicLabel);
  const unreadCardClass = conversation.has_unread
    ? "border-amber-200 bg-amber-50/70 hover:border-amber-300 hover:bg-amber-100/70 dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:bg-amber-900/30"
    : "border-border bg-card hover:border-emerald-200";

  return (
    <div
      className={`rounded-xl border p-3 shadow-sm transition hover:shadow-md ${unreadCardClass}`}
    >
      <div className="flex items-start gap-2.5">
        <Link
          href={`/conversations/${conversation.id}`}
          className="flex min-w-0 flex-1 items-start gap-2.5 transition-transform active:scale-[0.99]"
          onClick={() => {
            if (!opening) {
              onOpen();
            }
          }}
        >
          <Avatar className="h-8 w-8">
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
                <div className="truncate text-base font-semibold">{name}</div>
                {opening ? (
                  <span className="text-xs text-muted-foreground">Opening...</span>
                ) : null}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${statusDotClass}`}
                  aria-label={`Status: ${statusLabel}`}
                  title={`Status: ${statusLabel}`}
                />
                <span
                  className={`h-2.5 w-2.5 rounded-sm ${topicTint}`}
                  aria-label={`Topic: ${topicLabel}`}
                  title={`Topic: ${topicLabel}`}
                />
                {conversation.source ? (
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 text-[11px] capitalize text-muted-foreground"
                  >
                    {conversation.source}
                  </Badge>
                ) : null}
              </div>
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
