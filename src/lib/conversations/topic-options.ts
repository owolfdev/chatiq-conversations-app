export const BOT_TOPICS_CACHE_TTL_MS = 3 * 60 * 1000;

export type BotTopicOption = {
  label: string;
  priority: number | null;
};

export const parseTopicPriority = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

export const parseBotTopicsPayload = (payload: unknown): BotTopicOption[] => {
  const topicsRaw =
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { topics?: unknown[] }).topics)
      ? (payload as { topics: unknown[] }).topics
      : [];

  const normalized = topicsRaw
    .map((topic, index) => {
      const row = topic as Record<string, unknown>;
      const label = typeof row?.label === "string" ? row.label.trim() : "";
      const enabled = typeof row?.enabled === "boolean" ? row.enabled : true;
      if (!enabled || !label) {
        return null;
      }
      return {
        label,
        priority: parseTopicPriority(row?.priority),
        index,
      };
    })
    .filter(
      (
        value
      ): value is {
        label: string;
        priority: number | null;
        index: number;
      } => Boolean(value)
    );

  normalized.sort((a, b) => {
    if (a.priority !== null && b.priority !== null) {
      return a.priority - b.priority || a.index - b.index;
    }
    if (a.priority !== null && b.priority === null) {
      return -1;
    }
    if (a.priority === null && b.priority !== null) {
      return 1;
    }
    return a.index - b.index;
  });

  const deduped = new Map<string, BotTopicOption>();
  for (const item of normalized) {
    if (!deduped.has(item.label)) {
      deduped.set(item.label, {
        label: item.label,
        priority: item.priority,
      });
    }
  }

  return Array.from(deduped.values());
};

export const getMergedTopicLabels = (
  topicOptions: BotTopicOption[],
  currentTopic: string | null | undefined
): string[] => {
  const labels = new Set<string>();
  const ordered: string[] = [];
  for (const option of topicOptions) {
    if (!labels.has(option.label)) {
      labels.add(option.label);
      ordered.push(option.label);
    }
  }
  const normalizedCurrentTopic = currentTopic?.trim();
  if (normalizedCurrentTopic && !labels.has(normalizedCurrentTopic)) {
    ordered.push(normalizedCurrentTopic);
  }
  return ordered;
};

export const deriveTopicFilterOptions = (
  topics: Array<string | null | undefined>
): string[] => {
  return Array.from(
    new Set(
      topics
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
};
