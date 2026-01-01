// src/components/chat/chat.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { useChat, type ChatError } from "./use-chat";
import type { ChatMessage } from "@/types/chat";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TypingIndicator } from "./typing-indicator";
import {
  Ban,
  Info,
  RotateCcw,
  TriangleAlert,
  Lock,
  LockOpen,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MessageMarkdown } from "./message-markdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatProps {
  botSlug: string;
  initialMessages?: ChatMessage[];
  initialConversationId?: string | null;
  isInternal?: boolean;
  initialPrivateMode?: boolean;
  hidePrivacyToggle?: boolean;
  compact?: boolean;
  source?: string;
  sourceDetail?: Record<string, unknown>;
  autoFocusInput?: boolean;
  className?: string;
  userAvatarUrl?: string | null;
  assistantAvatarUrl?: string | null;
  userDisplayName?: string;
  assistantDisplayName?: string;
}

function renderFallbackMessage(
  error: ChatError | null,
  lastPrompt: string | null,
  actions: {
    retry: () => void;
    dismiss: () => void;
    setInput: (value: string) => void;
  }
) {
  if (!error) return null;

  const retryButton =
    lastPrompt !== null ? (
      <Button
        key="retry"
        size="sm"
        variant="outline"
        onClick={() => actions.retry()}
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    ) : null;

  const details = (error.details ?? {}) as Record<string, unknown>;

  switch (error.code) {
    case "ABORTED":
      return (
        <Alert className="w-full">
          <AlertTitle>Response paused</AlertTitle>
          <AlertDescription className="mt-1 space-y-2">
            <p>You paused the assistant. Please select an action.</p>
            <div className="flex flex-wrap gap-2">
              {retryButton}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (lastPrompt !== null) {
                    actions.setInput(lastPrompt);
                  }
                }}
              >
                Edit prompt
              </Button>
              <Button size="sm" variant="outline" onClick={actions.dismiss}>
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    case "QUOTA_EXCEEDED": {
      const limit =
        typeof details.limit === "number" ? details.limit : undefined;
      const used = typeof details.used === "number" ? details.used : undefined;
      return (
        <Alert className="w-full" variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Plan limit reached</AlertTitle>
          <AlertDescription className="mt-1 space-y-2">
            <p>{error.message}</p>
            {limit !== undefined && used !== undefined ? (
              <p>
                You used {used.toLocaleString()} of {limit.toLocaleString()}{" "}
                available units for this billing period.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <a href="/dashboard/billing/upgrade">Upgrade Plan</a>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
    case "RATE_LIMIT_EXCEEDED": {
      const limit =
        typeof details.limit === "number" ? details.limit : undefined;
      return (
        <Alert className="w-full">
          <Info className="h-4 w-4" />
          <AlertTitle>Too many requests</AlertTitle>
          <AlertDescription className="mt-1 space-y-2">
            <p>{error.message}</p>
            {limit !== undefined ? (
              <p>
                Limit: {limit.toLocaleString()} requests per rolling window.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">{retryButton}</div>
          </AlertDescription>
        </Alert>
      );
    }
    case "MODERATION_FLAGGED": {
      const flagged = Array.isArray(details.flaggedCategories)
        ? (details.flaggedCategories as string[])
        : [];
      return (
        <Alert className="w-full" variant="destructive">
          <Ban className="h-4 w-4" />
          <AlertTitle>Prompt blocked</AlertTitle>
          <AlertDescription className="mt-1 space-y-2">
            <p>
              {error.message ||
                "This prompt was blocked by safety filters. Try rephrasing it."}
            </p>
            {flagged.length ? (
              <p>
                Flagged categories:{" "}
                {flagged.map((tag) => tag.replaceAll("_", " ")).join(", ")}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (lastPrompt !== null) {
                    actions.setInput(lastPrompt);
                  }
                }}
              >
                Edit prompt
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
    case "SERVICE_UNAVAILABLE":
      return (
        <Alert className="w-full">
          <Info className="h-4 w-4" />
          <AlertTitle>Service temporarily unavailable</AlertTitle>
          <AlertDescription className="mt-1 space-y-2">
            <p>
              {error.message ||
                "This chatbot is temporarily unavailable. Please try again later."}
            </p>
            <div className="flex flex-wrap gap-2">{retryButton}</div>
          </AlertDescription>
        </Alert>
      );
    default:
      return (
        <Alert className="w-full" variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="mt-1 space-y-2">
            <p>{error.message}</p>
            <div className="flex flex-wrap gap-2">{retryButton}</div>
          </AlertDescription>
        </Alert>
      );
  }
}

export default function Chat({
  botSlug,
  initialMessages,
  initialConversationId,
  isInternal = true,
  initialPrivateMode = false,
  hidePrivacyToggle = false,
  compact = false,
  source,
  sourceDetail,
  autoFocusInput = true,
  className,
  userAvatarUrl,
  assistantAvatarUrl,
  userDisplayName,
  assistantDisplayName,
}: ChatProps) {
  const {
    messages,
    input,
    setInput,
    sendMessage,
    retry,
    abort,
    clearError,
    status,
    error,
    lastPrompt,
    privateMode,
    setPrivateMode,
  } = useChat(botSlug, {
    initialMessages,
    initialConversationId,
    isInternal,
    initialPrivateMode,
    source,
    sourceDetail,
  });

  const isStreaming = status === "streaming";
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInteractedRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  // Refocus input after a response completes
  useEffect(() => {
    if (!isStreaming && hasInteractedRef.current) {
      inputRef.current?.focus();
    }
  }, [isStreaming]);

  const disableSend = useMemo(
    () => !isStreaming && !input.trim(),
    [input, isStreaming]
  );

  const fallback = useMemo(
    () =>
      renderFallbackMessage(error, lastPrompt, {
        retry: () => void retry(),
        dismiss: clearError,
        setInput,
      }),
    [clearError, error, lastPrompt, retry, setInput]
  );

  const cardPadding = compact ? "p-3 md:p-4" : "p-3 md:p-4";
  const footerPadding = compact ? "p-2 md:p-3" : "p-3 md:p-4";

  return (
    <>
      <Card
        className={cn(
          "border-border bg-muted/50 dark:bg-muted/60 flex flex-col relative",
          className
        )}
      >
        <CardContent className={`${cardPadding} flex-grow overflow-hidden`}>
          <div
            ref={scrollRef}
            className="overflow-y-auto h-full flex flex-col gap-3 px-1"
          >
            {messages.map((msg, idx) => (
              <ChatBubble
                key={`${msg.role}-${idx}`}
                message={msg}
                isLatest={idx === messages.length - 1}
                isStreaming={isStreaming}
                showAvatars={Boolean(userAvatarUrl || assistantAvatarUrl)}
                userAvatarUrl={userAvatarUrl}
                assistantAvatarUrl={assistantAvatarUrl}
                userDisplayName={userDisplayName}
                assistantDisplayName={assistantDisplayName}
              />
            ))}

            <div ref={bottomRef} />
          </div>
        </CardContent>
        <CardFooter
          className={`border-t border-border ${footerPadding} flex flex-col gap-3`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              hasInteractedRef.current = true;
              if (isStreaming) {
                abort();
                return;
              }
              void sendMessage();
            }}
            className="flex gap-2 w-full items-center"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              disabled={isStreaming}
              className="border-border"
              autoFocus={autoFocusInput}
            />
            <Button
              type="submit"
              disabled={disableSend}
              variant={isStreaming ? "outline" : "default"}
            >
              {isStreaming ? "Pause" : "Send"}
            </Button>
          </form>
          {fallback}
        </CardFooter>
      </Card>
      {!hidePrivacyToggle && (
        // Privacy toggle at bottom left, outside the Card
        <div className="relative mt-2 ml-2 flex items-center gap-2 z-10 text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer bg-background/90 backdrop-blur-sm rounded-md p-1.5 border border-border/50 shadow-sm">
                {privateMode ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <LockOpen className="h-4 w-4" />
                )}
                <Switch
                  id="private-mode"
                  checked={privateMode}
                  onCheckedChange={setPrivateMode}
                  className="scale-75"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Private mode</p>
            </TooltipContent>
          </Tooltip>
          {privateMode && (
            <span className="text-xs bg-background/90 backdrop-blur-sm rounded-md px-2 py-1 border shadow-sm">
              Conversations won't be saved
            </span>
          )}
        </div>
      )}
    </>
  );
}

interface ChatBubbleProps {
  message: ChatMessage;
  isLatest: boolean;
  isStreaming: boolean;
  showAvatars: boolean;
  userAvatarUrl?: string | null;
  assistantAvatarUrl?: string | null;
  userDisplayName?: string;
  assistantDisplayName?: string;
}

function ChatBubble({
  message,
  isLatest,
  isStreaming,
  showAvatars,
  userAvatarUrl,
  assistantAvatarUrl,
  userDisplayName,
  assistantDisplayName,
}: ChatBubbleProps) {
  const isUser = message.role === "user";
  const content = message.content.trim();
  const isPlaceholder = !content.length && !isUser;
  const showIndicator = isPlaceholder && isStreaming && isLatest;

  if (isPlaceholder && !showIndicator) {
    return null;
  }

  return (
    <div
      className={cn("flex items-end gap-3", {
        "justify-end": isUser,
        "justify-start": !isUser,
      })}
    >
      {showAvatars && !isUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={assistantAvatarUrl || undefined}
            alt={assistantDisplayName || "Assistant"}
          />
          <AvatarFallback>
            {(assistantDisplayName || "AI").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm transition-colors border",
          isUser
            ? "bg-emerald-500/90 text-emerald-50 border-emerald-300/60 dark:border-emerald-400/40"
            : "bg-muted/70 border-muted-foreground/10 text-foreground dark:bg-muted/30 dark:border-muted-foreground/10 dark:text-foreground"
        )}
      >
        {showIndicator ? (
          <TypingIndicator variant="inline" className="pt-1" />
        ) : (
          <MessageMarkdown content={content} />
        )}
      </div>
      {showAvatars && isUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={userAvatarUrl || undefined}
            alt={userDisplayName || "User"}
          />
          <AvatarFallback>
            {(userDisplayName || "U").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
