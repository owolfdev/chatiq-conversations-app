// lib/chat/fetch-documents.ts
import { createClient } from "@/utils/supabase/server";

type Document = {
  id: string;
  title: string;
  content: string;
  tags: string[];
};

export async function fetchCandidateDocuments(
  botId: string
): Promise<Document[]> {
  const supabase = await createClient();

  const { data: directDocs, error: e1 } = await supabase
    .from("bot_documents")
    .select("id, title, content, tags")
    .or(`bot_id.eq.${botId},is_global.eq.true`);

  const { data: linkRows, error: e2 } = await supabase
    .from("bot_document_links")
    .select("document_id")
    .eq("bot_id", botId);

  const linkedIds = linkRows?.map((r) => r.document_id) ?? [];
  let linkedDocs: Document[] = [];

  if (linkedIds.length > 0) {
    const { data, error: e3 } = await supabase
      .from("bot_documents")
      .select("id, title, content, tags")
      .in("id", linkedIds);

    if (e3) throw new Error("Failed to fetch linked documents");
    linkedDocs = data ?? [];
  }

  if (e1 || e2) throw new Error("Failed to fetch documents");

  return [...(directDocs ?? []), ...linkedDocs];
}

export function filterDocumentsByTags(
  documents: Document[],
  keywords: string[]
): Document[] {
  return documents.filter((doc) => {
    if (!doc.tags || doc.tags.length === 0) return false;
    const docTags = new Set(doc.tags.map((tag) => tag.toLowerCase()));
    return keywords.some((kw) => docTags.has(kw.toLowerCase()));
  });
}
