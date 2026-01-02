"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  const statusClass =
    conversation.resolution_status === "resolved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <Link
      href={`/conversations/${conversation.id}`}
      className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={avatarUrl || undefined} alt={name} />
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{name}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] ${statusClass}`}
              >
                {statusLabel}
              </Badge>
              {conversation.source ? (
                <Badge
                  variant="outline"
                  className="text-[10px] capitalize text-muted-foreground"
                >
                  {conversation.source}
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className="text-[10px] text-muted-foreground"
              >
                {formatTime(lastSeen)}
              </Badge>
            </div>
          </div>
          <div className="mt-2 text-xs font-medium text-foreground">
            <span className="truncate">
              {conversation.topic || "General Inquiry"}
            </span>
          </div>
          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {preview}
          </div>
        </div>
      </div>
    </Link>
  );
}
