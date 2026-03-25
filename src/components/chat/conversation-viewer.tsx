// src/components/chat/conversation-viewer.tsx
"use client";

import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ChatAttachment, ChatMessage } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, UserRound, ImagePlus, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { MessageMarkdown } from "@/components/chat/message-markdown";
import { Switch } from "@/components/ui/switch";
import { getConversationSendRouteConfig } from "@/lib/conversations/send-route";
import {
  BOT_TOPICS_CACHE_TTL_MS,
  getMergedTopicLabels,
  parseBotTopicsPayload,
  type BotTopicOption,
} from "@/lib/conversations/topic-options";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getIntentSignalEntries,
  intentKeyDisplayLabel,
  intentSourceDisplayLabel,
} from "@/lib/chat/intent-metadata";

const LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto (detect)" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "th", label: "Thai" },
];

const MAX_ATTACHMENTS = 4;
const CONVERSATION_MESSAGES_PAGE_SIZE = 50;
const LOAD_OLDER_SCROLL_THRESHOLD_PX = 120;
const INBOUND_TRANSLATION_VIEWPORT_BUFFER = 8;
const INBOUND_TRANSLATION_FALLBACK_COUNT = 24;
type AgentCannedResponse = {
  id: string;
  pattern: string;
  pattern_type: "regex" | "keyword" | "exact";
  response: string;
  case_sensitive: boolean;
  fuzzy_threshold: number;
  attachments?: ChatMessage["attachments"];
};

type ConversationMessageRow = {
  id: string;
  sender: string;
  content: string;
  created_at: string;
  attachments?: unknown;
  metadata?: unknown;
};

function MessageIntentBadges({
  metadata,
  badgeClassName,
}: {
  metadata: unknown;
  badgeClassName?: string;
}) {
  const entries = getIntentSignalEntries(metadata);
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Detected intents">
      {entries.map((entry, i) => (
        <Badge
          key={`${entry.key}-${entry.recordedAt ?? i}`}
          variant="secondary"
          className={cn("text-[10px] font-normal", badgeClassName)}
          title={
            [intentSourceDisplayLabel(entry.source), entry.recordedAt]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        >
          {intentKeyDisplayLabel(entry.key)}
        </Badge>
      ))}
    </div>
  );
}

const normalizeInput = (text: string, caseSensitive: boolean) => {
  const trimmed = text.trim();
  return caseSensitive ? trimmed : trimmed.toLowerCase();
};

const matchExact = (
  pattern: string,
  input: string,
  caseSensitive: boolean
) => {
  return (
    normalizeInput(pattern, caseSensitive) ===
    normalizeInput(input, caseSensitive)
  );
};

const matchRegex = (
  pattern: string,
  input: string,
  caseSensitive: boolean
) => {
  try {
    const flags = caseSensitive ? "g" : "gi";
    const hasNonAscii = /[^\x00-\x7F]/.test(pattern);
    let regexPattern: string;
    if (pattern.startsWith("^") || hasNonAscii) {
      regexPattern = pattern;
    } else if (pattern.includes("|")) {
      const alternatives = pattern.split("|").map((alt) => alt.trim());
      regexPattern = alternatives.map((alt) => `\\b${alt}\\b`).join("|");
    } else {
      regexPattern = `\\b${pattern}\\b`;
    }
    const regex = new RegExp(regexPattern, flags);
    return regex.test(input);
  } catch (error) {
    console.error("Invalid regex pattern:", pattern, error);
    return false;
  }
};

const matchKeyword = (
  pattern: string,
  input: string,
  caseSensitive: boolean
) => {
  const normalizedInput = normalizeInput(input, caseSensitive);
  const alternatives = pattern.split("|").map((alt) => alt.trim());

  for (const alternative of alternatives) {
    const normalizedAlt = normalizeInput(alternative, caseSensitive);
    const keywords = normalizedAlt.split(/\s+/).filter(Boolean);

    if (keywords.length === 1) {
      const keyword = keywords[0];
      const wordBoundaryRegex = new RegExp(
        `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        caseSensitive ? "g" : "gi"
      );
      if (wordBoundaryRegex.test(normalizedInput)) {
        return true;
      }
      continue;
    }

    const words = normalizedInput.split(/\s+/);
    const keywordPositions: number[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (const keyword of keywords) {
        if (
          word === keyword ||
          new RegExp(
            `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            caseSensitive ? "g" : "gi"
          ).test(word)
        ) {
          keywordPositions.push(i);
          break;
        }
      }
    }

    if (keywordPositions.length !== keywords.length) {
      continue;
    }

    keywordPositions.sort((a, b) => a - b);
    let allClose = true;
    for (let i = 1; i < keywordPositions.length; i++) {
      const distance = keywordPositions[i] - keywordPositions[i - 1];
      if (distance > 2) {
        allClose = false;
        break;
      }
    }

    if (allClose) {
      return true;
    }
  }

  return false;
};

const matchesAgentResponse = (response: AgentCannedResponse, input: string) => {
  switch (response.pattern_type) {
    case "regex":
      return matchRegex(response.pattern, input, response.case_sensitive);
    case "keyword":
      return matchKeyword(response.pattern, input, response.case_sensitive);
    case "exact":
      return matchExact(response.pattern, input, response.case_sensitive);
  }
};

const TRANSLATION_SETTINGS_KEY = "chatiq.translation.settings";

const botTopicsCache = new Map<
  string,
  { expiresAt: number; topics: BotTopicOption[] }
>();

const getBotTopicOptions = async ({
  botId,
  force = false,
}: {
  botId: string;
  force?: boolean;
}): Promise<BotTopicOption[]> => {
  const now = Date.now();
  const cached = botTopicsCache.get(botId);
  if (!force && cached && cached.expiresAt > now) {
    return cached.topics;
  }

  const response = await fetch(`/api/bots/${botId}/topics?enabled=true`, {
    credentials: "include",
  });
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;
  if (!response.ok) {
    throw new Error(payload?.error || "Failed to load topics");
  }

  const parsed = parseBotTopicsPayload(payload);
  botTopicsCache.set(botId, {
    topics: parsed,
    expiresAt: now + BOT_TOPICS_CACHE_TTL_MS,
  });
  return parsed;
};

interface ConversationViewerProps {
  conversationId: string;
  botId: string;
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
  topicOptions?: string[];
  interactive?: boolean;
  backHref?: string;
}

export function ConversationViewer({
  conversationId,
  botId,
  botName,
  messages,
  conversationTopic,
  resolutionStatus,
  conversationSource,
  customerName,
  customerAvatarUrl,
  humanTakeover = false,
  humanTakeoverUntil,
  topicOptions: initialTopicOptions,
  interactive = false,
  backHref,
}: ConversationViewerProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>(
    []
  );
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [agentResponses, setAgentResponses] = useState<AgentCannedResponse[]>([]);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [status, setStatus] = useState<"resolved" | "unresolved">(
    resolutionStatus ?? "unresolved"
  );
  const [topic, setTopic] = useState(conversationTopic?.trim() || "");
  const [topicUpdating, setTopicUpdating] = useState(false);
  const [topicOptions, setTopicOptions] = useState<BotTopicOption[]>(
    (initialTopicOptions ?? [])
      .map((label) => (typeof label === "string" ? label.trim() : ""))
      .filter(Boolean)
      .map((label) => ({ label, priority: null }))
  );
  const [topicOptionsLoading, setTopicOptionsLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages);
  const [takeoverEnabled, setTakeoverEnabled] = useState(humanTakeover);
  const [takeoverUntil, setTakeoverUntil] = useState<string | null>(
    humanTakeoverUntil ?? null
  );
  const [takeoverUpdating, setTakeoverUpdating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousBotIdRef = useRef<string | null>(null);
  const lastMessageCountRef = useRef(localMessages.length);
  const optimisticIdsRef = useRef<Set<string>>(new Set());
  const autoScrollRef = useRef(true);
  const recentOptimisticRef = useRef<{
    content: string;
    role: ChatMessage["role"];
    createdAt: string;
  } | null>(null);
  const [translateInbound, setTranslateInbound] = useState(false);
  const [translateInboundTo, setTranslateInboundTo] = useState("en");
  const [translateOutbound, setTranslateOutbound] = useState(false);
  const [translateOutboundTo, setTranslateOutboundTo] = useState("auto");
  const [inboundTranslations, setInboundTranslations] = useState<
    Record<string, { text: string; detectedLanguage?: string }>
  >({});
  const [showOriginalMessages, setShowOriginalMessages] = useState<Set<string>>(
    new Set()
  );
  const [outboundPreview, setOutboundPreview] = useState<{
    input: string;
    original: string;
    translated: string;
    targetLanguage: string;
    attachments: ChatMessage["attachments"];
  } | null>(null);
  const [isTranslatingInbound, setIsTranslatingInbound] = useState(false);
  const [isTranslatingOutbound, setIsTranslatingOutbound] = useState(false);
  const [showTranslationPanel, setShowTranslationPanel] = useState(false);
  const messageElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const inFlightInboundTranslationKeysRef = useRef<Set<string>>(new Set());
  const [visibleMessageKeys, setVisibleMessageKeys] = useState<Set<string>>(
    new Set()
  );
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const oldestCursorRef = useRef<{ createdAt: string; id: string } | null>(null);
  const newestCursorRef = useRef<{ createdAt: string; id: string } | null>(null);
  const prependScrollHeightRef = useRef<number | null>(null);

  const renderImageAttachments = (attachments?: ChatMessage["attachments"]) => {
    const images =
      attachments?.filter(
        (attachment) => attachment?.type === "image" && attachment.url
      ) ?? [];
    if (images.length === 0) return null;

    return (
      <div className="mt-2 space-y-2">
        {images.map((image, index) => (
          <figure key={`${image.url}-${index}`} className="space-y-1">
            <img
              src={image.url}
              alt={image.alt ?? image.caption ?? "Attachment"}
              className="rounded-lg border border-border/60 max-h-64 w-auto"
              loading="lazy"
            />
            {(image.caption || image.alt) && (
              <figcaption className="text-xs text-muted-foreground">
                {image.caption || image.alt}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    );
  };

  const uploadAttachment = async (file: File) => {
    const formData = new FormData();
    formData.append("conversation_id", conversationId);
    formData.append("file", file);
    const response = await fetch("/api/conversations/attachments", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error || "Failed to upload image");
    }
    const payload = (await response.json().catch(() => null)) as {
      attachment?: ChatMessage["attachments"] extends Array<infer T> ? T : never;
    } | null;
    if (!payload?.attachment) {
      throw new Error("Upload failed");
    }
    return payload.attachment;
  };

  const handleAttachmentSelect = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) {
      return;
    }
    const remaining = MAX_ATTACHMENTS - (pendingAttachments?.length ?? 0);
    if (remaining <= 0) {
      toast.error("Attachment limit reached.");
      return;
    }
    setUploadingAttachments(true);
    try {
      for (const file of files.slice(0, remaining)) {
        const attachment = await uploadAttachment(file);
        setPendingAttachments((prev) => [...prev, attachment]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image"
      );
    } finally {
      setUploadingAttachments(false);
    }
  };

  const handleRemoveAttachment = (url: string) => {
    setPendingAttachments((prev) =>
      prev.filter((attachment) => attachment?.url !== url)
    );
  };

  const resolveAgentResponse = (input: string) => {
    const match = agentResponses.find((response) =>
      matchesAgentResponse(response, input)
    );
    const matchedAttachments = Array.isArray(match?.attachments)
      ? match!.attachments.filter(
          (item) =>
            item &&
            item.type === "image" &&
            typeof item.url === "string" &&
            item.url.trim()
        )
      : [];
    const mergedAttachments = [...matchedAttachments, ...pendingAttachments].slice(
      0,
      MAX_ATTACHMENTS
    );
    return {
      content: match?.response ?? input,
      attachments: mergedAttachments,
      matched: Boolean(match),
    };
  };

  useEffect(() => {
    if (!interactive || !botId) {
      return;
    }
    let isMounted = true;
    const fetchAgentResponses = async () => {
      try {
        const response = await fetch(
          `/api/canned-responses/agent?botId=${encodeURIComponent(botId)}`,
          { credentials: "include" }
        );
        if (!response.ok) {
          return;
        }
        const payload = (await response.json().catch(() => null)) as {
          responses?: AgentCannedResponse[];
        } | null;
        if (!isMounted) return;
        setAgentResponses(payload?.responses ?? []);
      } catch (error) {
        console.error("Failed to load agent canned responses", error);
      }
    };
    fetchAgentResponses();
    return () => {
      isMounted = false;
    };
  }, [botId, interactive]);

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

  const getMessageKey = (msg: ChatMessage, index: number) =>
    msg.id ?? msg.createdAt ?? `${index}-${msg.role}`;

  const setMessageElementRef = (key: string, node: HTMLDivElement | null) => {
    if (node) {
      messageElementsRef.current.set(key, node);
      return;
    }
    messageElementsRef.current.delete(key);
  };

  const mapConversationMessage = (row: ConversationMessageRow): ChatMessage => ({
    id: row.id,
    role: (row.sender === "bot" ? "assistant" : "user") as ChatMessage["role"],
    content: row.content,
    createdAt: row.created_at,
    messageMetadata: row.metadata ?? undefined,
    attachments: Array.isArray(row.attachments)
      ? row.attachments.filter(
          (item: any) =>
            item &&
            item.type === "image" &&
            typeof item.url === "string" &&
            item.url.trim()
        )
      : undefined,
  });

  const mergePersistedRows = (
    rows: ConversationMessageRow[],
    mode: "replace" | "append" | "prepend"
  ) => {
    const persisted = rows.map(mapConversationMessage);
    setLocalMessages((prev) => {
      const optimistic: ChatMessage[] = prev.filter((msg) =>
        msg.createdAt ? optimisticIdsRef.current.has(msg.createdAt) : false
      );
      const nonOptimistic = prev.filter(
        (msg) => !(msg.createdAt && optimisticIdsRef.current.has(msg.createdAt))
      );
      const filteredOptimistic = optimistic.filter((msg) => {
        const matched = persisted.some(
          (row) =>
            row.role === msg.role &&
            row.content.trim() === msg.content.trim() &&
            row.createdAt &&
            msg.createdAt &&
            Math.abs(
              new Date(row.createdAt).getTime() - new Date(msg.createdAt).getTime()
            ) < 10_000
        );
        if (matched && msg.createdAt) {
          optimisticIdsRef.current.delete(msg.createdAt);
        }
        return !matched;
      });

      const base =
        mode === "replace"
          ? persisted
          : mode === "prepend"
          ? [...persisted, ...nonOptimistic]
          : [...nonOptimistic, ...persisted];

      return dedupeMessages([...base, ...filteredOptimistic]);
    });
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
  const customerInitials = customerName?.trim().slice(0, 2).toUpperCase();
  const botAvatarUrl = "/images/avatars/icon-512.jpg";
  const takeoverExpiry = takeoverUntil ? new Date(takeoverUntil) : null;
  const takeoverActive =
    takeoverEnabled &&
    (!takeoverExpiry || takeoverExpiry.getTime() > Date.now());
  const statusLabel = status === "resolved" ? "Resolved" : "Open";
  const lastMessageAt =
    localMessages.length > 0
      ? localMessages[localMessages.length - 1]?.createdAt
      : null;
  const standalone = true;
  const sourceLabel = conversationSource || "Unknown source";
  const hasEnabledTopicOptions = topicOptions.length > 0;
  const mergedTopicLabels = getMergedTopicLabels(topicOptions, topic);
  const topicSelectorDisabled =
    topicUpdating ||
    topicOptionsLoading ||
    !standalone ||
    !hasEnabledTopicOptions;

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    const persisted = localMessages.filter(
      (msg) =>
        msg.id &&
        !msg.id.startsWith("optimistic-") &&
        typeof msg.createdAt === "string"
    );
    messageIdsRef.current = new Set(
      persisted
        .map((msg) => msg.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    );
    if (!persisted.length) {
      newestCursorRef.current = null;
      return;
    }
    const newest = persisted[persisted.length - 1];
    if (newest?.createdAt && newest.id) {
      newestCursorRef.current = { createdAt: newest.createdAt, id: newest.id };
    }
  }, [localMessages]);

  useEffect(() => {
    setTopic(conversationTopic?.trim() || "");
  }, [conversationTopic]);

  useEffect(() => {
    const previousBotId = previousBotIdRef.current;
    if (previousBotId && previousBotId !== botId) {
      botTopicsCache.delete(previousBotId);
    }
    previousBotIdRef.current = botId;
  }, [botId]);

  useEffect(() => {
    if (Array.isArray(initialTopicOptions) && initialTopicOptions.length > 0) {
      setTopicOptions(
        initialTopicOptions
          .map((label) => (typeof label === "string" ? label.trim() : ""))
          .filter(Boolean)
          .map((label) => ({ label, priority: null }))
      );
      setTopicOptionsLoading(false);
      return;
    }

    let active = true;
    const loadTopicOptions = async () => {
      if (!botId) {
        setTopicOptions([]);
        return;
      }
      setTopicOptionsLoading(true);
      try {
        const options = await getBotTopicOptions({ botId });
        if (!active) return;
        setTopicOptions(options);
      } catch (error) {
        if (!active) return;
        setTopicOptions([]);
        toast.error(
          error instanceof Error ? error.message : "Failed to load topics"
        );
      } finally {
        if (active) {
          setTopicOptionsLoading(false);
        }
      }
    };

    void loadTopicOptions();
    return () => {
      active = false;
    };
  }, [botId, conversationId, initialTopicOptions]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem(TRANSLATION_SETTINGS_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as {
        showPanel?: boolean;
        inboundEnabled?: boolean;
        inboundTo?: string;
        outboundEnabled?: boolean;
        outboundTo?: string;
      };
      if (typeof parsed.showPanel === "boolean") {
        setShowTranslationPanel(parsed.showPanel);
      }
      if (typeof parsed.inboundEnabled === "boolean") {
        setTranslateInbound(parsed.inboundEnabled);
      }
      if (typeof parsed.inboundTo === "string") {
        setTranslateInboundTo(parsed.inboundTo);
      }
      if (typeof parsed.outboundEnabled === "boolean") {
        setTranslateOutbound(parsed.outboundEnabled);
      }
      if (typeof parsed.outboundTo === "string") {
        setTranslateOutboundTo(parsed.outboundTo);
      }
    } catch (error) {
      console.error("Failed to load translation settings", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const payload = JSON.stringify({
      showPanel: showTranslationPanel,
      inboundEnabled: translateInbound,
      inboundTo: translateInboundTo,
      outboundEnabled: translateOutbound,
      outboundTo: translateOutboundTo,
    });
    window.localStorage.setItem(TRANSLATION_SETTINGS_KEY, payload);
  }, [
    showTranslationPanel,
    translateInbound,
    translateInboundTo,
    translateOutbound,
    translateOutboundTo,
  ]);

  useEffect(() => {
    if (!translateInbound) {
      setInboundTranslations({});
      setShowOriginalMessages(new Set());
      inFlightInboundTranslationKeysRef.current.clear();
      setVisibleMessageKeys(new Set());
      return;
    }
    setInboundTranslations({});
    setShowOriginalMessages(new Set());
    inFlightInboundTranslationKeysRef.current.clear();
  }, [translateInbound, translateInboundTo]);

  useEffect(() => {
    if (!interactive || !translateInbound || !scrollRef.current) {
      return;
    }

    const root = scrollRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleMessageKeys((prev) => {
          const next = new Set(prev);
          let changed = false;

          for (const entry of entries) {
            const key = entry.target.getAttribute("data-message-key");
            if (!key) {
              continue;
            }
            if (entry.isIntersecting) {
              if (!next.has(key)) {
                next.add(key);
                changed = true;
              }
            } else if (next.has(key)) {
              next.delete(key);
              changed = true;
            }
          }

          return changed ? next : prev;
        });
      },
      {
        root,
        threshold: 0.2,
      }
    );

    const nodes = Array.from(messageElementsRef.current.values());
    for (const node of nodes) {
      observer.observe(node);
    }

    return () => {
      observer.disconnect();
    };
  }, [interactive, localMessages, translateInbound]);

  useEffect(() => {
    if (!interactive || !translateInbound) {
      return;
    }

    const translateIncoming = async () => {
      const indexedMessages = localMessages.map((msg, index) => ({
        key: getMessageKey(msg, index),
        msg,
        index,
      }));
      const candidateMessages = indexedMessages
        .filter(({ msg }) => msg.content.trim().length > 0);
      if (!candidateMessages.length) {
        return;
      }

      let targetKeyWindow = new Set<string>();
      if (visibleMessageKeys.size > 0) {
        const visibleIndexes = indexedMessages
          .filter(({ key }) => visibleMessageKeys.has(key))
          .map(({ index }) => index);

        if (visibleIndexes.length > 0) {
          const minVisible = Math.min(...visibleIndexes);
          const maxVisible = Math.max(...visibleIndexes);
          const windowStart = Math.max(
            0,
            minVisible - INBOUND_TRANSLATION_VIEWPORT_BUFFER
          );
          const windowEnd = Math.min(
            indexedMessages.length - 1,
            maxVisible + INBOUND_TRANSLATION_VIEWPORT_BUFFER
          );

          for (let i = windowStart; i <= windowEnd; i += 1) {
            targetKeyWindow.add(indexedMessages[i].key);
          }
        }
      }

      if (targetKeyWindow.size === 0) {
        const fallbackStart = Math.max(
          0,
          indexedMessages.length - INBOUND_TRANSLATION_FALLBACK_COUNT
        );
        for (let i = fallbackStart; i < indexedMessages.length; i += 1) {
          targetKeyWindow.add(indexedMessages[i].key);
        }
      }

      const pending = candidateMessages.filter(
        ({ key }) =>
          targetKeyWindow.has(key) &&
          inboundTranslations[key] === undefined &&
          !inFlightInboundTranslationKeysRef.current.has(key)
      );
      if (!pending.length) {
        return;
      }
      pending.forEach(({ key }) => {
        inFlightInboundTranslationKeysRef.current.add(key);
      });

      setIsTranslatingInbound(true);
      try {
        const response = await fetch("/api/translation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            mode: "translate",
            texts: pending.map(({ msg }) => msg.content),
            targetLanguage: translateInboundTo,
          }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error || "Translation failed");
        }
        const payload = (await response.json().catch(() => null)) as {
          translations?: Array<{
            translatedText?: string;
            detectedSourceLanguage?: string;
          }>;
        } | null;
        const translations = payload?.translations ?? [];
        setInboundTranslations((prev) => {
          const next = { ...prev };
          pending.forEach(({ key, msg }, index) => {
            const translation = translations[index];
            next[key] = {
              text: translation?.translatedText ?? msg.content,
              detectedLanguage: translation?.detectedSourceLanguage,
            };
          });
          return next;
        });
      } catch (error) {
        console.error("Failed to translate inbound messages", error);
        toast.error(
          error instanceof Error ? error.message : "Inbound translation failed"
        );
      } finally {
        pending.forEach(({ key }) => {
          inFlightInboundTranslationKeysRef.current.delete(key);
        });
        setIsTranslatingInbound(false);
      }
    };

    translateIncoming();
  }, [
    inboundTranslations,
    interactive,
    localMessages,
    translateInbound,
    translateInboundTo,
    visibleMessageKeys,
  ]);

  useEffect(() => {
    if (!outboundPreview) {
      return;
    }
    if (outboundPreview.input !== draft.trim()) {
      setOutboundPreview(null);
    }
  }, [draft, outboundPreview]);

  useEffect(() => {
    if (prependScrollHeightRef.current === null) {
      return;
    }
    const container = scrollRef.current;
    if (!container) {
      prependScrollHeightRef.current = null;
      return;
    }
    const previousHeight = prependScrollHeightRef.current;
    prependScrollHeightRef.current = null;
    const nextHeight = container.scrollHeight;
    const delta = nextHeight - previousHeight;
    if (delta > 0) {
      container.scrollTop += delta;
    }
  }, [localMessages]);

  useEffect(() => {
    if (!interactive) {
      return;
    }
    if (scrollRef.current) {
      if (!autoScrollRef.current) {
        return;
      }
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
          attachments?: unknown;
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
                prev.map((msg) => {
                  if (msg.createdAt !== optimistic.createdAt) {
                    return msg;
                  }
                  return {
                    ...msg,
                    id: row.id,
                    createdAt: row.created_at,
                    content,
                    role: role as ChatMessage["role"],
                  };
                })
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
              attachments: Array.isArray(row.attachments)
                ? row.attachments.filter(
                    (item: any) =>
                      item &&
                      item.type === "image" &&
                      typeof item.url === "string" &&
                      item.url.trim()
                  )
                : undefined,
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

    setHasOlderMessages(false);
    setIsLoadingOlderMessages(false);
    oldestCursorRef.current = null;
    newestCursorRef.current = null;

    let isMounted = true;
    const fetchMessagesPage = async (params: URLSearchParams) => {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages?${params.toString()}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json().catch(() => null)) as {
        messages?: ConversationMessageRow[];
        hasMore?: boolean;
        nextBefore?: string | null;
        nextBeforeId?: string | null;
      } | null;
      return payload;
    };

    const fetchInitialMessages = async () => {
      try {
        const params = new URLSearchParams({
          limit: String(CONVERSATION_MESSAGES_PAGE_SIZE),
        });
        const payload = await fetchMessagesPage(params);
        if (!payload || !isMounted) {
          return;
        }
        const rows = payload?.messages ?? [];
        mergePersistedRows(rows, "replace");
        if (payload?.hasMore && payload.nextBefore && payload.nextBeforeId) {
          oldestCursorRef.current = {
            createdAt: payload.nextBefore,
            id: payload.nextBeforeId,
          };
          setHasOlderMessages(true);
        } else {
          oldestCursorRef.current = null;
          setHasOlderMessages(false);
        }
      } catch (error) {
        console.error("Failed to poll messages", error);
      }
    };

    const pollNewMessages = async () => {
      try {
        const params = new URLSearchParams({
          limit: String(CONVERSATION_MESSAGES_PAGE_SIZE),
        });
        const cursor = newestCursorRef.current;
        if (cursor?.createdAt) {
          params.set("since", cursor.createdAt);
          if (cursor.id) {
            params.set("sinceId", cursor.id);
          }
        }
        const payload = await fetchMessagesPage(params);
        if (!payload || !isMounted) {
          return;
        }
        const rows = payload?.messages ?? [];
        if (!rows.length) {
          return;
        }
        mergePersistedRows(rows, "append");
      } catch (error) {
        console.error("Failed to poll messages", error);
      }
    };

    fetchInitialMessages();
    const interval = window.setInterval(pollNewMessages, 5000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [conversationId, interactive]);

  const loadOlderMessages = async () => {
    if (!interactive || isLoadingOlderMessages || !hasOlderMessages) {
      return;
    }
    const cursor = oldestCursorRef.current;
    if (!cursor) {
      setHasOlderMessages(false);
      return;
    }

    setIsLoadingOlderMessages(true);
    try {
      const params = new URLSearchParams({
        limit: String(CONVERSATION_MESSAGES_PAGE_SIZE),
        before: cursor.createdAt,
      });
      if (cursor.id) {
        params.set("beforeId", cursor.id);
      }
      const response = await fetch(
        `/api/conversations/${conversationId}/messages?${params.toString()}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to load older messages");
      }
      const payload = (await response.json().catch(() => null)) as {
        messages?: ConversationMessageRow[];
        hasMore?: boolean;
        nextBefore?: string | null;
        nextBeforeId?: string | null;
      } | null;
      const rows = payload?.messages ?? [];
      if (!rows.length) {
        oldestCursorRef.current = null;
        setHasOlderMessages(false);
        return;
      }

      if (scrollRef.current) {
        prependScrollHeightRef.current = scrollRef.current.scrollHeight;
      }
      mergePersistedRows(rows, "prepend");

      if (payload?.hasMore && payload.nextBefore && payload.nextBeforeId) {
        oldestCursorRef.current = {
          createdAt: payload.nextBefore,
          id: payload.nextBeforeId,
        };
        setHasOlderMessages(true);
      } else {
        oldestCursorRef.current = null;
        setHasOlderMessages(false);
      }
    } catch (error) {
      console.error("Failed to load older messages", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load older messages"
      );
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  const sendMessage = async (
    content: string,
    attachments: ChatMessage["attachments"] = [],
    restoreDraft?: string
  ) => {
    const trimmed = content.trim();
    if ((!trimmed && (!attachments || attachments.length === 0)) || sending) {
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
    inputRef.current?.focus();
    setLocalMessages((prev) => [
      ...prev,
      {
        id: `optimistic-${optimisticTimestamp}`,
        role: "assistant",
        content: trimmed || "Image",
        createdAt: optimisticTimestamp,
        attachments: attachments?.length ? attachments : undefined,
      },
    ]);
    try {
      const { endpoint, payload: requestPayload } = getConversationSendRouteConfig(
        conversationSource,
        conversationId,
        trimmed,
        attachments
      );
      const response = await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(requestPayload),
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
      setPendingAttachments([]);
      inputRef.current?.focus();
    } catch (error) {
      console.error("Failed to send message", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send message"
      );
      setDraft(restoreDraft ?? trimmed);
      setLocalMessages((prev) =>
        prev.filter((msg) => msg.createdAt !== optimisticTimestamp)
      );
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if ((!trimmed && pendingAttachments.length === 0) || sending) {
      return;
    }

    const resolved = trimmed
      ? resolveAgentResponse(trimmed)
      : { content: "", attachments: pendingAttachments, matched: false };

    if (translateOutbound) {
      if (!resolved.content.trim() && resolved.attachments.length > 0) {
        await sendMessage("", resolved.attachments);
        return;
      }
      setIsTranslatingOutbound(true);
      try {
        let targetLanguage = translateOutboundTo;
        setDraft(trimmed);
        if (targetLanguage === "auto") {
          const lastUserMessage = [...localMessages]
            .reverse()
            .find((msg) => msg.role === "user" && msg.content.trim());
          if (!lastUserMessage) {
            throw new Error("No inbound message available for language detect");
          }
          const detectResponse = await fetch("/api/translation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              mode: "detect",
              text: lastUserMessage.content,
            }),
          });
          if (!detectResponse.ok) {
            const payload = (await detectResponse.json().catch(() => null)) as {
              error?: string;
            } | null;
            throw new Error(payload?.error || "Language detection failed");
          }
          const payload = (await detectResponse.json().catch(() => null)) as {
            detections?: Array<{ language?: string }>;
          } | null;
          const detectedLanguage = payload?.detections?.[0]?.language;
          if (!detectedLanguage) {
            throw new Error("Unable to detect customer language");
          }
          targetLanguage = detectedLanguage;
        }

        const translateResponse = await fetch("/api/translation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            mode: "translate",
            text: resolved.content,
            targetLanguage,
          }),
        });
        if (!translateResponse.ok) {
          const payload = (await translateResponse.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error || "Translation failed");
        }
        const payload = (await translateResponse.json().catch(() => null)) as {
          translations?: Array<{ translatedText?: string }>;
        } | null;
        const translated = payload?.translations?.[0]?.translatedText;
        if (!translated) {
          throw new Error("Translation returned empty text");
        }
        setOutboundPreview({
          input: trimmed,
          original: resolved.content,
          translated,
          targetLanguage,
          attachments: resolved.attachments,
        });
        setShowTranslationPanel(true);
      } catch (error) {
        console.error("Failed to translate outbound message", error);
        toast.error(
          error instanceof Error ? error.message : "Outbound translation failed"
        );
      } finally {
        setIsTranslatingOutbound(false);
      }
      return;
    }

    await sendMessage(resolved.content, resolved.attachments, trimmed);
  };

  const handleSendTranslated = async () => {
    if (!outboundPreview) {
      return;
    }
    const originalDraft = outboundPreview.original;
    const translated = outboundPreview.translated;
    const attachments = outboundPreview.attachments ?? [];
    setOutboundPreview(null);
    await sendMessage(translated, attachments, originalDraft);
  };

  const handleSendOriginal = async () => {
    if (!outboundPreview) {
      return;
    }
    const original = outboundPreview.original;
    const attachments = outboundPreview.attachments ?? [];
    setOutboundPreview(null);
    await sendMessage(original, attachments, original);
  };

  const toggleShowOriginal = (key: string) => {
    setShowOriginalMessages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
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
      const nextEnabled = Boolean(payload?.enabled ?? enabled);
      setTakeoverEnabled(nextEnabled);
      if (enabled) {
        if (payload?.human_takeover_until) {
          setTakeoverUntil(payload.human_takeover_until);
        }
      } else {
        setTakeoverUntil(null);
      }
      toast.success(nextEnabled ? "Human has taken over." : "Bot is active.");
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
        if (response.status === 400) {
          botTopicsCache.delete(botId);
          try {
            const refreshed = await getBotTopicOptions({ botId, force: true });
            setTopicOptions(refreshed);
          } catch (refreshError) {
            console.error("Failed to refresh bot topics", refreshError);
          }
        }
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
          {backHref ? (
            <div className="pt-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={backHref}>Back to booking</Link>
              </Button>
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-3">
            <Button
              variant={takeoverActive ? "outline" : "default"}
              size="sm"
              onClick={() => handleTakeoverToggle(!takeoverActive)}
              disabled={takeoverUpdating || !standalone}
              aria-pressed={takeoverActive}
            >
              <span className="inline-flex items-center gap-2">
                {takeoverActive ? (
                  <UserRound className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                {takeoverUpdating
                  ? "Switching..."
                  : takeoverActive
                  ? "Agent"
                  : "Bot"}
              </span>
            </Button>
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
              <div className="min-w-[120px]">
                <Select
                  value={topic || undefined}
                  onValueChange={handleTopicChange}
                  disabled={topicSelectorDisabled}
                >
                  <SelectTrigger className="h-9 text-xs w-[160px] sm:w-[190px]">
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topicOptionsLoading ? (
                      <SelectItem value="__loading" disabled>
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading topics...
                        </span>
                      </SelectItem>
                    ) : mergedTopicLabels.length > 0 ? (
                      mergedTopicLabels.map((label) => (
                        <SelectItem key={label} value={label}>
                          {label}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__empty" disabled>
                        No enabled topics configured for this bot.
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {!topicOptionsLoading && !hasEnabledTopicOptions ? (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    No enabled topics configured for this bot.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>{localMessages.length} messages</div>
            <div>
              {`Last Activity: ${lastMessageAt ? formatShortDate(lastMessageAt) : "—"}`}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="max-w-[180px] truncate">
                <span title={botName}>{botName}</span>
              </Badge>
              <Badge variant="outline" className="capitalize">
                {sourceLabel}
              </Badge>
            </div>
            <div
              className="text-lg font-semibold text-foreground text-right max-w-[240px] truncate"
              title={displayCustomerName}
            >
              {displayCustomerName}
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
                onScroll={() => {
                  const container = scrollRef.current;
                  if (!container) return;
                  const nearBottom =
                    container.scrollHeight -
                      container.scrollTop -
                      container.clientHeight <=
                    80;
                  autoScrollRef.current = nearBottom;
                  if (
                    container.scrollTop <= LOAD_OLDER_SCROLL_THRESHOLD_PX &&
                    hasOlderMessages &&
                    !isLoadingOlderMessages
                  ) {
                    void loadOlderMessages();
                  }
                }}
              >
                {hasOlderMessages ? (
                  <div className="flex justify-center pb-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isLoadingOlderMessages}
                      onClick={() => void loadOlderMessages()}
                    >
                      {isLoadingOlderMessages ? "Loading older..." : "Load older"}
                    </Button>
                  </div>
                ) : null}
                {localMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No messages in this conversation
                  </div>
                ) : (
                  localMessages.map((msg, idx) => {
                    const isUser = msg.role === "user";
                    const messageKey = getMessageKey(msg, idx);
                    const translationEntry = translateInbound
                      ? inboundTranslations[messageKey]
                      : undefined;
                    const showOriginal = showOriginalMessages.has(messageKey);
                    const contentToRender =
                      translationEntry && !showOriginal
                        ? translationEntry.text
                        : msg.content;
                    return (
                      <div
                        key={msg.id ?? msg.createdAt ?? idx}
                        ref={(node) => setMessageElementRef(messageKey, node)}
                        data-message-key={messageKey}
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
                            <MessageMarkdown content={contentToRender} />
                          </div>
                          {renderImageAttachments(msg.attachments)}
                          {isUser ? (
                            <MessageIntentBadges metadata={msg.messageMetadata} />
                          ) : null}
                          {translationEntry && translateInbound && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <Badge variant="outline" className="text-[10px]">
                                {translationEntry.detectedLanguage
                                  ? `${translationEntry.detectedLanguage} → ${translateInboundTo}`
                                  : `→ ${translateInboundTo}`}
                              </Badge>
                              <button
                                type="button"
                                className="underline underline-offset-2"
                                onClick={() => toggleShowOriginal(messageKey)}
                              >
                                {showOriginal ? "Show translation" : "Show original"}
                              </button>
                            </div>
                          )}
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
                              {customerInitials ? (
                                customerInitials
                              ) : (
                                <UserRound className="h-4 w-4" aria-hidden="true" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="border-t border-border px-4 pt-2 pb-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleAttachmentSelect}
                      disabled={sending || uploadingAttachments || !standalone}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={
                        sending ||
                        uploadingAttachments ||
                        pendingAttachments.length >= MAX_ATTACHMENTS ||
                        !standalone
                      }
                      aria-label="Add image"
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                    {uploadingAttachments && (
                      <Badge variant="outline" className="text-[10px]">
                        Uploading...
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!showTranslationPanel && (
                      <span className="flex items-center gap-1">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            translateInbound ? "bg-emerald-500" : "bg-zinc-300"
                          )}
                          aria-hidden="true"
                        />
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            translateOutbound ? "bg-emerald-500" : "bg-zinc-300"
                          )}
                          aria-hidden="true"
                        />
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTranslationPanel((prev) => !prev)}
                    >
                      {showTranslationPanel ? "Hide" : "Translate"}
                    </Button>
                  </div>
                </div>
                {showTranslationPanel && (
                  <>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={translateInbound}
                          onCheckedChange={setTranslateInbound}
                        />
                        <span>Translate incoming</span>
                        <Select
                          value={translateInboundTo}
                          onValueChange={setTranslateInboundTo}
                          disabled={!translateInbound}
                        >
                          <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue placeholder="Language" />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGE_OPTIONS.filter(
                              (option) => option.value !== "auto"
                            ).map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isTranslatingInbound && (
                          <Badge variant="outline" className="text-[10px]">
                            Translating...
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={translateOutbound}
                          onCheckedChange={(checked) => {
                            setTranslateOutbound(checked);
                            setOutboundPreview(null);
                          }}
                        />
                        <span>Translate outgoing</span>
                        <Select
                          value={translateOutboundTo}
                          onValueChange={setTranslateOutboundTo}
                          disabled={!translateOutbound}
                        >
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue placeholder="Language" />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isTranslatingOutbound && (
                          <Badge variant="outline" className="text-[10px]">
                            Translating...
                          </Badge>
                        )}
                      </div>
                    </div>
                    {outboundPreview && (
                      <div className="rounded-md border border-border/70 bg-muted/30 p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            Preview ({outboundPreview.targetLanguage})
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            Confirm before sending
                          </span>
                        </div>
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {outboundPreview.translated}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleSendTranslated}
                            disabled={sending}
                          >
                            Send translated
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleSendOriginal}
                            disabled={sending}
                          >
                            Send original
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setOutboundPreview(null)}
                            disabled={sending}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="px-4 space-y-2 pb-2">
                {pendingAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-2">
                    {pendingAttachments.map((attachment) => (
                      <div
                        key={attachment?.url}
                        className="relative h-16 w-16 overflow-hidden rounded-md border border-border/60"
                      >
                        <img
                          src={attachment?.url}
                          alt={attachment?.alt ?? "Attachment"}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          className="absolute right-1 top-1 rounded-full bg-background/80 p-1 shadow"
                          onClick={() =>
                            attachment?.url &&
                            handleRemoveAttachment(attachment.url)
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <form
                onSubmit={handleSend}
                className="border-t border-border pt-3 pb-3 mt-0 flex items-center gap-2 shrink-0 bg-background px-4"
              >
                <Input
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Reply as human..."
                  disabled={!standalone}
                />
                <Button
                  type="submit"
                  disabled={
                    sending ||
                    uploadingAttachments ||
                    (!draft.trim() && pendingAttachments.length === 0) ||
                    !standalone
                  }
                >
                  {translateOutbound && draft.trim()
                    ? isTranslatingOutbound
                      ? "Translating..."
                      : "Preview"
                    : sending
                    ? "Sending..."
                    : "Send"}
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
                        {renderImageAttachments(msg.attachments)}
                        {isUser ? (
                          <MessageIntentBadges
                            metadata={msg.messageMetadata}
                            badgeClassName={
                              isUser
                                ? "border-emerald-200/50 bg-emerald-600/25 text-emerald-50"
                                : undefined
                            }
                          />
                        ) : null}
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
                            {customerInitials ? (
                              customerInitials
                            ) : (
                              <UserRound className="h-4 w-4" aria-hidden="true" />
                            )}
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
