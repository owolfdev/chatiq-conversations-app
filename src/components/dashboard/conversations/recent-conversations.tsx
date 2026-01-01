"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";

import type { RecentConversation } from "@/app/actions/chat/get-recent-conversations";
import { deleteConversation } from "@/app/actions/chat/delete-conversation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RecentConversationsPanelProps {
  conversations: RecentConversation[];
}

export function RecentConversationsPanel({
  conversations,
}: RecentConversationsPanelProps) {
  const [items, setItems] = useState(conversations);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (conversationId: string) => {
    if (!conversationId) return;
    const confirmDelete = window.confirm(
      "Delete this conversation and all of its messages?"
    );
    if (!confirmDelete) {
      return;
    }

    setPendingId(conversationId);
    startTransition(async () => {
      try {
        await deleteConversation(conversationId);
        setItems((prev) => prev.filter((item) => item.id !== conversationId));
      } catch (error) {
        console.error(error);
        // TODO: integrate toast system. For now, fallback to alert.
        alert(
          error instanceof Error
            ? error.message
            : "Failed to delete conversation"
        );
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <Card className="h-full bg-muted border-border">
      <CardHeader>
        <CardTitle>Recent Conversations</CardTitle>
        <CardDescription>
          Latest chat activity across your bots. Click to continue or review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No conversations yet. Engage with your bot to see history here.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((conversation) => {
              const lastMessagePreview =
                conversation.lastMessage?.content?.slice(0, 120) ?? "";
              const timestamp = formatDistanceToNow(
                new Date(conversation.createdAt),
                { addSuffix: true }
              );
              const linkHref = `/chat/${conversation.bot.slug}?conversationId=${conversation.id}`;

              return (
                <li
                  key={conversation.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background/40 p-3 hover:border-border transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={linkHref}
                        className="font-medium text-sm hover:underline"
                      >
                        {conversation.title?.slice(0, 80) ||
                          "Untitled conversation"}
                      </Link>
                      <Badge variant="secondary" className="text-xs">
                        {conversation.bot.name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {timestamp}
                      </span>
                    </div>
                    {lastMessagePreview && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {lastMessagePreview}
                        {conversation.lastMessage &&
                          conversation.lastMessage.content.length > 120 &&
                          "..."}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {conversation.messageCount} messages
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(conversation.id)}
                      disabled={isPending && pendingId === conversation.id}
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <CardFooter className="justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/analytics">View analytics</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}


