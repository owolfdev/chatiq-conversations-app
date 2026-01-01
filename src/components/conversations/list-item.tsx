"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ConversationListItem } from "@/app/actions/conversations/get-conversations";

interface ConversationListItemProps {
  conversation: ConversationListItem;
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

const getCustomerProfile = (
  sourceDetail: ConversationListItem["source_detail"]
) => {
  if (!sourceDetail || typeof sourceDetail !== "object") {
    return { name: "Customer", avatarUrl: null };
  }
  const detail = sourceDetail as Record<string, unknown>;
  const name =
    typeof detail.line_display_name === "string"
      ? detail.line_display_name
      : typeof detail.customer_name === "string"
      ? detail.customer_name
      : typeof detail.label === "string"
      ? detail.label
      : "Customer";
  const avatarUrl =
    typeof detail.line_picture_url === "string"
      ? detail.line_picture_url
      : null;
  return { name, avatarUrl };
};

export function ConversationListItemCard({
  conversation,
}: ConversationListItemProps) {
  const lastSeen = conversation.last_message_at || conversation.created_at;
  const preview = formatPreview(
    conversation.topic_message_preview,
    conversation.title || "Conversation"
  );
  const { name, avatarUrl } = getCustomerProfile(conversation.source_detail);
  const statusLabel =
    conversation.resolution_status === "resolved" ? "Resolved" : "Open";
  const statusDot =
    conversation.resolution_status === "resolved"
      ? "bg-emerald-500"
      : "bg-amber-500";

  return (
    <Link
      href={`/conversations/${conversation.id}`}
      className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11">
          <AvatarImage src={avatarUrl || undefined} alt={name} />
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{name}</div>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatTime(lastSeen)}
            </div>
          </div>
          <div className="mt-2 text-sm font-medium text-foreground">
            {conversation.topic || "General Inquiry"}
          </div>
          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {preview}
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${statusDot}`} />
              {statusLabel}
            </span>
            {conversation.source ? (
              <span className="capitalize">{conversation.source}</span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
