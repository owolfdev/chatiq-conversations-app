// src/components/chat/use-chat.ts
"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "@/types/chat";

export interface UseChatOptions {
  initialMessages?: ChatMessage[];
  initialConversationId?: string | null;
  isInternal?: boolean;
  initialPrivateMode?: boolean;
  source?: string;
  sourceDetail?: Record<string, unknown>;
}

export type ChatStatus = "idle" | "streaming" | "aborted" | "error";

export interface ChatError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

class ChatRequestError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ChatRequestError";
    this.code = code;
    this.details = details;
  }
}

export function useChat(botSlug: string, options?: UseChatOptions) {
  const isInternal = options?.isInternal ?? true;
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => options?.initialMessages ?? []
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<ChatError | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(
    () => options?.initialConversationId ?? null
  );
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [privateMode, setPrivateMode] = useState<boolean>(
    () => options?.initialPrivateMode ?? false
  );
  const source = options?.source;
  const sourceDetail = options?.sourceDetail;

  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingAssistantIndexRef = useRef<number | null>(null);

  const clearPendingAssistant = useCallback(() => {
    const index = pendingAssistantIndexRef.current;
    if (index === null) {
      return;
    }
    setMessages((prev) => {
      if (index < 0 || index >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const assistant = next[index];
      if (!assistant?.content) {
        next.splice(index, 1);
      }
      return next;
    });
    pendingAssistantIndexRef.current = null;
  }, []);

  const updateAssistantMessage = useCallback((content: string) => {
    const index = pendingAssistantIndexRef.current;
    if (index === null) {
      return;
    }
    setMessages((prev) => {
      if (index < 0 || index >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const target = next[index];
      next[index] = { ...target, content };
      return next;
    });
  }, []);

  const handleStreamResponse = useCallback(
    async (res: Response) => {
      if (!res.body) {
        throw new ChatRequestError(
          "EMPTY_STREAM",
          "Empty response stream from server"
        );
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let assistantMessage = "";
      let streamConversationId: string | null = null;
      let pendingData = "";
      let eventData = "";
      let streamFinished = false;

      const handleEventPayload = (rawData: string) => {
        const payload = rawData.trim();
        if (!payload) return false;

        if (payload === "[DONE]") {
          return true;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(payload);
        } catch (parseError) {
          throw new ChatRequestError(
            "STREAM_PARSE_ERROR",
            `Failed to parse streaming response: ${
              parseError instanceof Error
                ? parseError.message
                : String(parseError)
            }`
          );
        }

        if (typeof parsed !== "object" || parsed === null) {
          return false;
        }

        const maybeError = (parsed as { error?: unknown }).error as
          | {
              code?: string;
              message?: string;
              details?: Record<string, unknown>;
            }
          | string
          | undefined;

        if (maybeError) {
          if (typeof maybeError === "string") {
            throw new ChatRequestError("UNKNOWN_ERROR", maybeError);
          }
          throw new ChatRequestError(
            maybeError.code ?? "UNKNOWN_ERROR",
            maybeError.message ?? "Unknown error occurred",
            maybeError.details
          );
        }

        const maybeConversationId = (parsed as { conversationId?: string })
          .conversationId;
        if (maybeConversationId) {
          streamConversationId = maybeConversationId;
        }

        const delta = (
          parsed as {
            choices?: Array<{ delta?: { content?: string } }>;
          }
        ).choices?.[0]?.delta?.content;

        if (delta) {
          assistantMessage += delta;
          updateAssistantMessage(assistantMessage);
        }

        return false;
      };

      while (!streamFinished) {
        const { value, done } = await reader.read();
        pendingData += decoder.decode(value ?? new Uint8Array(), {
          stream: !done,
        });

        let newlineIndex: number;
        while ((newlineIndex = pendingData.indexOf("\n")) !== -1) {
          const line = pendingData.slice(0, newlineIndex);
          pendingData = pendingData.slice(newlineIndex + 1);

          if (line.startsWith("data:")) {
            eventData += line.slice("data:".length) + "\n";
          } else if (line.trim() === "") {
            if (!eventData) continue;
            const shouldStop = handleEventPayload(eventData);
            eventData = "";
            if (shouldStop) {
              streamFinished = true;
              break;
            }
          }
        }

        if (done) {
          if (eventData.trim()) {
            handleEventPayload(eventData);
            eventData = "";
          }
          streamFinished = true;
        }
      }

      if (streamConversationId) {
        setConversationId(streamConversationId);
      }
      pendingAssistantIndexRef.current = null;
    },
    [updateAssistantMessage]
  );

  const executeChat = useCallback(
    async (prompt: string, { retry = false }: { retry?: boolean } = {}) => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setStatus("streaming");
      setLoading(true);
      setError(null);

      if (!retry) {
        setLastPrompt(trimmedPrompt);
      }

      const userMessage: ChatMessage = { role: "user", content: trimmedPrompt };

      let assistantIndex = -1;
      setMessages((prev) => {
        const base = retry ? [...prev] : [...prev, userMessage];
        assistantIndex = base.length;
        pendingAssistantIndexRef.current = assistantIndex;
        return [...base, { role: "assistant", content: "" }];
      });

      try {
        const payload: Record<string, unknown> = {
          message: trimmedPrompt,
          bot_slug: botSlug,
          history: [...messages].slice(-10),
          conversation_id: conversationId,
          isInternal, // 🔒 internal use triggers owner plan when true
          private_mode: privateMode, // 🔒 private mode - don't save conversation
        };
        if (source) {
          payload.source = source;
        }
        if (sourceDetail) {
          payload.source_detail = sourceDetail;
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const contentType = res.headers.get("content-type") || "";

        if (!contentType.includes("text/event-stream")) {
          const data = await res.json();
          if (!res.ok) {
            const payload = (data?.error ?? {}) as {
              code?: string;
              message?: string;
              details?: Record<string, unknown>;
            };
            throw new ChatRequestError(
              payload.code ?? "UNKNOWN_ERROR",
              payload.message ?? "Unknown error occurred",
              payload.details
            );
          }

          const responseText =
            typeof data.response === "string" ? data.response : "";
          updateAssistantMessage(responseText);
          if (data.conversationId) {
            setConversationId(data.conversationId);
          }
          pendingAssistantIndexRef.current = null;
          setStatus("idle");
          return;
        }

        await handleStreamResponse(res);
        setStatus("idle");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setStatus("aborted");
          setError({
            code: "ABORTED",
            message: "Response stopped.",
          });
        } else if (err instanceof ChatRequestError) {
          setStatus("error");
          setError({
            code: err.code,
            message: err.message,
            details: err.details,
          });
        } else {
          setStatus("error");
          setError({
            code: "UNKNOWN_ERROR",
            message:
              err instanceof Error ? err.message : "Unknown error occurred",
          });
        }
        clearPendingAssistant();
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [
      botSlug,
      conversationId,
      clearPendingAssistant,
      handleStreamResponse,
      messages,
      updateAssistantMessage,
      isInternal,
      privateMode,
      source,
      sourceDetail,
    ]
  );

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    const prompt = input;
    setInput("");
    await executeChat(prompt);
  }, [executeChat, input]);

  const retryLast = useCallback(async () => {
    if (!lastPrompt) return;
    await executeChat(lastPrompt, { retry: true });
  }, [executeChat, lastPrompt]);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setStatus("idle");
  }, []);

  return {
    messages,
    input,
    setInput,
    sendMessage,
    retry: retryLast,
    abort,
    clearError,
    loading,
    status,
    error,
    conversationId,
    lastPrompt,
    isStreaming: status === "streaming",
    privateMode,
    setPrivateMode,
  };
}
