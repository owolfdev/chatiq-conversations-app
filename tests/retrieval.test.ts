import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";

import { retrieveRelevantChunks } from "@/lib/documents/retrieval";
import type { SupabaseClient } from "@supabase/supabase-js";

const EMBEDDING_VECTOR = Array.from({ length: 10 }, (_, i) => i + 1);

class SupabaseRetrievalStub {
  public updates: Array<{ context_chunk_ids: string[] }> = [];

  constructor(
    private readonly options: {
      pinnedChunkIds?: string[];
      pinnedChunkRecords?: Array<{
        id: string;
        document_id: string;
        text: string;
        anchor_id?: string | null;
        canonical_url?: string | null;
      }>;
      matches?: Array<{
        chunk_id: string;
        document_id: string;
        chunk_text: string;
        similarity?: number;
        anchor_id?: string | null;
        canonical_url?: string | null;
      }>;
      rpcError?: boolean;
    }
  ) {}

  from(table: string) {
    if (table === "bot_conversations") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  context_chunk_ids: this.options.pinnedChunkIds ?? [],
                },
                error: null,
              }),
          }),
          maybeSingle: () =>
            Promise.resolve({
              data: {
                context_chunk_ids: this.options.pinnedChunkIds ?? [],
              },
              error: null,
            }),
        }),
        update: (values: { context_chunk_ids: string[] }) => ({
          eq: () => {
            this.updates.push(values);
            return Promise.resolve({ error: null });
          },
        }),
      };
    }

    if (table === "bot_doc_chunks") {
      return {
        select: () => ({
          in: () =>
            Promise.resolve({
              data:
                this.options.pinnedChunkRecords?.map((record) => ({
                  id: record.id,
                  document_id: record.document_id,
                  text: record.text,
                  anchor_id: record.anchor_id ?? null,
                  bot_documents: [
                    { canonical_url: record.canonical_url ?? null },
                  ],
                })) ?? [],
              error: null,
            }),
        }),
      };
    }

    throw new Error(`Unexpected table access: ${table}`);
  }

  rpc(_fn: string, _args: unknown) {
    if (this.options.rpcError) {
      return Promise.resolve({
        data: null,
        error: new Error("RPC failure"),
      });
    }

    const data = this.options.matches ?? [];
    return Promise.resolve({ data, error: null });
  }
}

describe("retrieveRelevantChunks", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: EMBEDDING_VECTOR }],
      }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns pinned chunks first and deduplicates retrieved documents", async () => {
    const supabaseStub = new SupabaseRetrievalStub({
      pinnedChunkIds: ["chunk-pinned"],
      pinnedChunkRecords: [
        {
          id: "chunk-pinned",
          document_id: "doc-1",
          text: "Pinned content",
          canonical_url: "https://docs.example.com/doc-1",
        },
      ],
      matches: [
        {
          chunk_id: "chunk-a",
          document_id: "doc-2",
          chunk_text: "Relevant chunk A",
          similarity: 0.9,
        },
        {
          chunk_id: "chunk-b",
          document_id: "doc-2",
          chunk_text: "Duplicate document chunk",
          similarity: 0.8,
        },
        {
          chunk_id: "chunk-c",
          document_id: "doc-3",
          chunk_text: "Relevant chunk C",
          similarity: 0.7,
        },
      ],
    });

    const result = await retrieveRelevantChunks({
      supabase: supabaseStub as unknown as SupabaseClient,
      teamId: "team-123",
      botId: "bot-456",
      query: "How do I use the product?",
      conversationId: "conversation-1",
    });

    expect(result.chunks).toHaveLength(3);
    expect(result.chunks[0]).toMatchObject({
      chunkId: "chunk-pinned",
      source: "pinned",
    });
    expect(result.chunks[1]).toMatchObject({
      chunkId: "chunk-a",
      documentId: "doc-2",
      source: "retrieved",
    });
    expect(result.chunks[2]).toMatchObject({
      chunkId: "chunk-c",
      documentId: "doc-3",
      source: "retrieved",
    });

    expect(result.pinnedChunkIds).toEqual([
      "chunk-pinned",
      "chunk-a",
      "chunk-c",
    ]);
    expect(supabaseStub.updates[0]).toEqual({
      context_chunk_ids: ["chunk-pinned", "chunk-a", "chunk-c"],
    });
  });

  it("falls back to pinned chunks when retrieval RPC fails", async () => {
    const supabaseStub = new SupabaseRetrievalStub({
      pinnedChunkIds: ["chunk-pinned"],
      pinnedChunkRecords: [
        {
          id: "chunk-pinned",
          document_id: "doc-1",
          text: "Pinned content",
        },
      ],
      rpcError: true,
    });

    const result = await retrieveRelevantChunks({
      supabase: supabaseStub as unknown as SupabaseClient,
      teamId: "team-123",
      botId: "bot-456",
      query: "Fallback scenario",
      conversationId: "conversation-1",
    });

    expect(result.chunks).toEqual([
      expect.objectContaining({
        chunkId: "chunk-pinned",
        source: "pinned",
      }),
    ]);
    expect(result.pinnedChunkIds).toEqual(["chunk-pinned"]);
  });
});

