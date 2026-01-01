// app/dashboard/documents/edit/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import DocumentForm from "@/components/forms/document-form";
import { DocumentFormValues } from "@/types/forms";

export default function EditDocumentPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const docId = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableBots, setAvailableBots] = useState<
    { id: string; name: string }[]
  >([]);
  const [initialValues, setInitialValues] = useState<DocumentFormValues | null>(
    null
  );

  useEffect(() => {
    (async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user || !docId) return;

      const [docRes, linkRes, botsRes] = await Promise.all([
        supabase
          .from("bot_documents")
          .select("title, content, tags, is_global, canonical_url")
          .eq("id", docId)
          .single(),
        supabase
          .from("bot_document_links")
          .select("bot_id")
          .eq("document_id", docId),
        supabase
          .from("bot_bots")
          .select("id, name")
          .eq("user_id", user.id)
          .eq("status", "active"),
      ]);

      if (docRes.error) return setError("Failed to load document");
      if (botsRes.data) setAvailableBots(botsRes.data);

      setInitialValues({
        ...docRes.data,
        tags: docRes.data.tags || [],
        linkedBots: linkRes.data?.map((l) => l.bot_id) || [],
        canonicalUrl: docRes.data.canonical_url || undefined,
      });
    })();
  }, [supabase, docId]);

  const handleUpdate = async (doc: DocumentFormValues) => {
    setLoading(true);
    setError(null);
    setStatus("Saving changes...");

    try {
      const updateResponse = await fetch("/api/documents/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: docId,
          title: doc.title,
          content: doc.content,
          tags: doc.tags,
          isGlobal: doc.is_global,
          canonicalUrl: doc.canonicalUrl,
          linkedBots: doc.linkedBots,
        }),
      });

      if (!updateResponse.ok) {
        const payload = await updateResponse.json().catch(() => ({}));
        const message =
          (payload as { error?: { message?: string } })?.error?.message ||
          "Error updating document";
        setError(message);
        setStatus(null);
        return;
      }

      const { is_flagged } = (await updateResponse.json()) as {
        id: string;
        is_flagged?: boolean;
      };

      if (is_flagged) {
        setStatus("Document updated but flagged by content moderation. Redirecting...");
      }

      setStatus("Processing document for AI search...");
      const ingestResponse = await fetch("/api/documents/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId: docId }),
      });

      if (!ingestResponse.ok) {
        const payload = await ingestResponse.json().catch(() => ({}));
        console.error(
          "Failed to enqueue ingestion job",
          payload?.error ?? ingestResponse.statusText
        );
      }

      setStatus("Creating AI embeddings (this may take a few seconds)...");
      // Process embeddings using server action (has access to secret)
      const { processEmbeddings } = await import("@/app/actions/documents/process-embeddings");
      const embedResult = await processEmbeddings(10);

      if (!embedResult.success) {
        console.error(
          "Failed to process embedding jobs immediately",
          embedResult.error
        );
      }

      setStatus("Complete! Redirecting...");
      router.push("/dashboard/documents");
    } finally {
      setLoading(false);
      setStatus(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-6">Edit Document</h1>
      {initialValues ? (
        <DocumentForm
          initialValues={initialValues}
          availableBots={availableBots}
          onSubmit={handleUpdate}
          loading={loading}
          status={status}
          error={error}
        />
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
