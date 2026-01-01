import { env } from "@/lib/env";
import {
  detectLanguage,
  normalizeLanguageTag,
} from "@/lib/language/detect-language";
import type { SupabaseClient } from "@supabase/supabase-js";

const EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_TOP_K = 12;
const DEFAULT_PIN_LIMIT = 6;
const DEFAULT_DETERMINISTIC_TOP_K = 6;
const MAX_CANDIDATES = 200;
const LANGUAGE_BONUS = [0.02, 0.01];
const MIN_QUERY_CONFIDENCE = 0.6;

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  canonicalUrl: string | null;
  anchorId: string | null;
  content: string;
  language: string | null;
  documentLanguage: string | null;
  translationGroupId: string | null;
  similarity: number | null;
  source: "pinned" | "retrieved";
}

export interface RetrieveOptions {
  supabase: SupabaseClient;
  teamId: string;
  botId: string;
  query: string;
  conversationId?: string;
  preferredLanguages?: string[];
  topK?: number;
  pinLimit?: number;
}

export interface RetrieveResult {
  chunks: RetrievedChunk[];
  pinnedChunkIds: string[];
}

export interface DeterministicRetrieveOptions {
  supabase: SupabaseClient;
  teamId: string;
  botId: string;
  query: string;
  topK?: number;
}

async function embedQueryText(query: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: query,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message =
      payload?.error?.message ?? `${response.status} ${response.statusText}`;
    throw new Error(`Embedding request failed: ${message}`);
  }

  const json = (await response.json()) as {
    data?: Array<{ embedding: number[] }>;
  };

  const embedding = json.data?.[0]?.embedding;

  if (!embedding) {
    throw new Error("Embedding response missing vector data.");
  }

  return embedding;
}

async function getPinnedChunkIds(
  supabase: SupabaseClient,
  conversationId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("bot_conversations")
    .select("context_chunk_ids")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch conversation context", error);
    return [];
  }

  if (!data?.context_chunk_ids) {
    return [];
  }

  try {
    if (Array.isArray(data.context_chunk_ids)) {
      return data.context_chunk_ids.filter(
        (value): value is string => typeof value === "string"
      );
    }
    return [];
  } catch (parseError) {
    console.error("Failed to parse context_chunk_ids", parseError);
    return [];
  }
}

async function setPinnedChunkIds(
  supabase: SupabaseClient,
  conversationId: string,
  chunkIds: string[]
) {
  const { error } = await supabase
    .from("bot_conversations")
    .update({
      context_chunk_ids: chunkIds,
    })
    .eq("id", conversationId);

  if (error) {
    console.error("Failed to update pinned chunk ids", error);
  }
}

async function fetchPinnedChunks(
  supabase: SupabaseClient,
  chunkIds: string[]
): Promise<RetrievedChunk[]> {
  if (chunkIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("bot_doc_chunks")
    .select(
      "id, text, anchor_id, document_id, language, bot_documents!inner(id, canonical_url, language, translation_group_id)"
    )
    .in("id", chunkIds);

  if (error || !data) {
    console.error("Failed to fetch pinned chunks", error);
    return [];
  }

  const byId = new Map(
    data.map((row) => {
      const docRel = row.bot_documents;
      const canonicalUrl = Array.isArray(docRel)
        ? (docRel[0]?.canonical_url as string | undefined) ?? null
        : docRel && typeof docRel === "object" && "canonical_url" in docRel
        ? ((docRel as { canonical_url?: string }).canonical_url ?? null)
        : null;
      const documentLanguage = Array.isArray(docRel)
        ? (docRel[0]?.language as string | undefined) ?? null
        : docRel && typeof docRel === "object" && "language" in docRel
        ? ((docRel as { language?: string }).language ?? null)
        : null;
      const translationGroupId = Array.isArray(docRel)
        ? (docRel[0]?.translation_group_id as string | undefined) ?? null
        : docRel && typeof docRel === "object" && "translation_group_id" in docRel
        ? ((docRel as { translation_group_id?: string }).translation_group_id ?? null)
        : null;

      return [
        row.id,
        {
          chunkId: row.id as string,
          documentId: row.document_id as string,
          canonicalUrl,
          anchorId: (row.anchor_id as string | undefined) ?? null,
          content: row.text as string,
          language:
            typeof row.language === "string" ? row.language : null,
          documentLanguage,
          translationGroupId,
          similarity: null,
          source: "pinned" as const,
        },
      ] as const;
    })
  );

  const resolved: RetrievedChunk[] = [];
  for (const id of chunkIds) {
    const chunk = byId.get(id);
    if (chunk) {
      resolved.push(chunk);
    }
  }

  return resolved;
}

export async function retrieveRelevantChunks({
  supabase,
  teamId,
  botId,
  query,
  conversationId,
  preferredLanguages,
  topK = DEFAULT_TOP_K,
  pinLimit = DEFAULT_PIN_LIMIT,
}: RetrieveOptions): Promise<RetrieveResult> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { chunks: [], pinnedChunkIds: [] };
  }

  const existingPinnedIds =
    conversationId ? await getPinnedChunkIds(supabase, conversationId) : [];

  const queryDetection = detectLanguage(trimmedQuery);
  const detectedLanguage =
    queryDetection.language && queryDetection.confidence !== null
      ? normalizeLanguageTag(queryDetection.language)
      : null;

  const normalizedPreferred = (preferredLanguages ?? [])
    .map((lang) => normalizeLanguageTag(lang))
    .filter(Boolean);

  const preferred =
    normalizedPreferred.length > 0
      ? normalizedPreferred
      : detectedLanguage && (queryDetection.confidence ?? 0) >= MIN_QUERY_CONFIDENCE
      ? [detectedLanguage, "en"]
      : ["en"];

  const uniquePreferred = Array.from(new Set(preferred));

  console.log("[retrieval:language] query", {
    detectedLanguage,
    confidence: queryDetection.confidence ?? null,
    preferred: uniquePreferred,
  });

  const queryEmbedding = await embedQueryText(trimmedQuery);
  const candidateLimit = Math.min(
    Math.max(topK * 4, topK),
    MAX_CANDIDATES
  );

  const { data: matches, error: matchError } = await supabase.rpc(
    "match_bot_embeddings",
    {
      p_query_embedding: queryEmbedding,
      p_team_id: teamId,
      p_bot_id: botId,
      p_limit: candidateLimit,
    }
  );

  if (matchError) {
    console.error("match_bot_embeddings failed", matchError);
    return {
      chunks: await fetchPinnedChunks(supabase, existingPinnedIds),
      pinnedChunkIds: existingPinnedIds,
    };
  }

  const retrievedRaw = (matches ?? []).map((row: Record<string, unknown>) => {
    const chunkLanguage =
      typeof row.chunk_language === "string" ? row.chunk_language : null;
    const documentLanguage =
      typeof row.document_language === "string" ? row.document_language : null;

    return {
      chunkId: row.chunk_id as string,
      documentId: row.document_id as string,
      canonicalUrl: (row.canonical_url as string) ?? null,
      anchorId: (row.anchor_id as string) ?? null,
      content: (row.chunk_text as string) ?? "",
      language: chunkLanguage ? normalizeLanguageTag(chunkLanguage) : null,
      documentLanguage: documentLanguage
        ? normalizeLanguageTag(documentLanguage)
        : null,
      translationGroupId:
        typeof row.translation_group_id === "string"
          ? row.translation_group_id
          : null,
      similarity: typeof row.similarity === "number" ? row.similarity : null,
      source: "retrieved" as const,
    };
  });

  const scored = retrievedRaw.map(
    (chunk: {
      chunkId: string;
      documentId: string;
      canonicalUrl: string | null;
      anchorId: string | null;
      content: string;
      language: string | null;
      documentLanguage: string | null;
      translationGroupId: string | null;
      similarity: number | null;
      source: "retrieved";
    }) => {
    const language = chunk.language ?? chunk.documentLanguage;
    const rank = language ? uniquePreferred.indexOf(language) : -1;
    const bonus =
      rank === 0 ? LANGUAGE_BONUS[0] : rank === 1 ? LANGUAGE_BONUS[1] : 0;
    return {
      chunk,
      score: (chunk.similarity ?? 0) + bonus,
      language,
    };
  });

  scored.sort(
    (a: { score: number }, b: { score: number }) => b.score - a.score
  );

  const seenDocuments = new Set<string>();
  const seenTranslationGroups = new Set<string>();
  const primarySelected: RetrievedChunk[] = [];
  const secondary: RetrievedChunk[] = [];

  for (const candidate of scored) {
    const chunk = candidate.chunk;
    const translationGroup = chunk.translationGroupId;
    const hasDoc = seenDocuments.has(chunk.documentId);
    const hasGroup =
      translationGroup !== null && seenTranslationGroups.has(translationGroup);

    if (hasDoc || hasGroup) {
      secondary.push(chunk);
      continue;
    }

    primarySelected.push(chunk);
    seenDocuments.add(chunk.documentId);
    if (translationGroup) {
      seenTranslationGroups.add(translationGroup);
    }
    if (primarySelected.length >= topK) break;
  }

  if (primarySelected.length < topK) {
    for (const chunk of secondary) {
      if (seenDocuments.has(chunk.documentId)) continue;
      primarySelected.push(chunk);
      seenDocuments.add(chunk.documentId);
      if (primarySelected.length >= topK) break;
    }
  }

  const pinnedChunks = await fetchPinnedChunks(supabase, existingPinnedIds);
  for (const chunk of pinnedChunks) {
    seenDocuments.add(chunk.documentId);
  }

  const combinedChunks: RetrievedChunk[] = [
    ...pinnedChunks,
    ...primarySelected,
  ];

  const retrievedLanguages = primarySelected.map(
    (chunk) => chunk.language ?? chunk.documentLanguage ?? "unknown"
  );
  const fallbackUsed =
    uniquePreferred.length > 0
      ? !primarySelected.some(
          (chunk) => (chunk.language ?? chunk.documentLanguage) === uniquePreferred[0]
        )
      : false;

  console.log("[retrieval:language] results", {
    retrievedLanguages,
    fallbackUsed,
  });

  const nextPinnedIds = Array.from(
    new Set([
      ...existingPinnedIds,
      ...primarySelected.map((chunk) => chunk.chunkId),
    ])
  ).slice(0, pinLimit);

  if (conversationId) {
    await setPinnedChunkIds(supabase, conversationId, nextPinnedIds);
  }

  return {
    chunks: combinedChunks,
    pinnedChunkIds: nextPinnedIds,
  };
}

export async function retrieveDeterministicChunks({
  supabase,
  teamId,
  botId,
  query,
  topK = DEFAULT_DETERMINISTIC_TOP_K,
}: DeterministicRetrieveOptions): Promise<RetrievedChunk[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const { data: matches, error } = await supabase.rpc(
    "match_bot_chunks_deterministic",
    {
      p_query: trimmedQuery,
      p_team_id: teamId,
      p_bot_id: botId,
      p_limit: topK,
    }
  );

  if (error) {
    console.error("match_bot_chunks_deterministic failed", error);
    return [];
  }

  return (matches ?? []).map((row: Record<string, unknown>) => ({
    chunkId: row.chunk_id as string,
    documentId: row.document_id as string,
    canonicalUrl: (row.canonical_url as string) ?? null,
    anchorId: (row.anchor_id as string) ?? null,
    content: (row.chunk_text as string) ?? "",
    language:
      typeof row.chunk_language === "string"
        ? normalizeLanguageTag(row.chunk_language)
        : null,
    documentLanguage:
      typeof row.document_language === "string"
        ? normalizeLanguageTag(row.document_language)
        : null,
    translationGroupId:
      typeof row.translation_group_id === "string"
        ? row.translation_group_id
        : null,
    similarity: typeof row.rank === "number" ? row.rank : null,
    source: "retrieved" as const,
  }));
}
