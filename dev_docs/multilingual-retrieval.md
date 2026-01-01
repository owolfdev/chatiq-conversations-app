# Multilingual Retrieval System

## Goals
- Support unlimited languages with a soft preference for the user’s preferred language(s).
- Never hard-filter by language unless explicitly requested.
- Preserve existing English-only behavior when language metadata is missing.
- Keep answer language separate from source language.
- Add observability for detection, preferences, and fallbacks.

## Data Model (Minimal)
Documents (`bot_documents`)
- `language` (text, nullable) BCP-47 tag
- `language_confidence` (double precision, nullable)
- `language_override` (text, nullable)
- `translation_group_id` (text, nullable)

Chunks (`bot_doc_chunks`)
- `language` (text, nullable)
- `language_confidence` (double precision, nullable)
- `language_override` (text, nullable)

Indexes
- `bot_documents(language)`
- `bot_documents(translation_group_id)`
- `bot_doc_chunks(language)`

## Ingest Flow
- Language detection runs during ingestion.
- If `language_override` is present, it wins (confidence = 1.0).
- Otherwise, auto-detect language from the document text.
- Document language is stored on `bot_documents`.
- Chunks inherit the detected language by default (upgrade path: per-chunk detection later).

## Query Language Handling
- Detect query language (lightweight heuristic detector).
- Preferred list defaults to:
  - `[query_language, "en"]` if detection is confident
  - `["en"]` if detection is low confidence
- A user-specified preferred list overrides detection.

## Retrieval Algorithm (Soft Preference)
1) Embed query (OpenAI embeddings) and fetch top-N candidates by vector similarity.
2) Apply a small language bonus for preferred languages:
   - `+0.02` for preferred[0]
   - `+0.01` for preferred[1]
   - `+0.00` otherwise
3) Sort by (similarity + bonus).
4) De-duplicate:
   - Prefer one chunk per document
   - Prefer one chunk per `translation_group_id`
5) Return top-k, keeping fallbacks if preferred language is missing.

## Translation Grouping
- If documents are translated variants, set the same `translation_group_id` on each.
- Retrieval dedupes across translation groups so translated duplicates don’t occupy top-k.

## Deterministic Fallback (FTS)
- Deterministic fallback uses Postgres FTS with `english` config.
- This is **not multilingual**; Thai/CJK will not match reliably.
- For multilingual fallback without LLM, consider vector retrieval (requires query embeddings API).

## Generation Behavior
- Retrieval selects sources (prefer same-language when available).
- LLM response language is driven by UI/user selection, not by source language.
- Citations should reference retrieved chunks, ideally in the user’s language when available.

## Observability
Log per query:
- Detected query language + confidence
- Preferred language list
- Languages of retrieved chunks
- Languages of chunks sent to the LLM
- Whether fallback to non-preferred language occurred

## Current Implementation Notes
- Language detection is heuristic (Thai/Japanese/Korean/Chinese/English).
- Missing language metadata does not block retrieval; it just removes language bonus.
- Deterministic FTS remains English-only until a multilingual tokenizer is added.

## Upgrade Paths
- Add chunk-level language detection for mixed-language documents.
- Swap detector for a higher-accuracy library.
- Implement multilingual FTS with per-language `tsvector` where supported.
