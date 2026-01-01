// app/dashboard/documents/new/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import DocumentForm from "@/components/forms/document-form";
import { DocumentFormValues } from "@/types/forms";

export default function NewDocumentPage() {
  const router = useRouter();
  const supabase = createClient();
  const [availableBots, setAvailableBots] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const { data } = await supabase
        .from("bot_bots")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("status", "active");
      if (data) setAvailableBots(data);
    })();
  }, [supabase]);

  const handleCreate = async (doc: DocumentFormValues) => {
    setLoading(true);
    setError(null);
    setStatus("Saving document...");
    try {
      const createResponse = await fetch("/api/documents/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: doc.title,
          content: doc.content,
          tags: doc.tags,
          isGlobal: doc.is_global,
          canonicalUrl: doc.canonicalUrl,
          linkedBots: doc.linkedBots,
        }),
      });

      if (!createResponse.ok) {
        const payload = await createResponse.json().catch(() => ({}));
        const message =
          (payload as { error?: { message?: string } })?.error?.message ||
          "Error creating document";
        setError(message);
        setStatus(null);
        return;
      }

      const { id: documentId } = (await createResponse.json()) as { id: string };

      setStatus("Processing document for AI search...");
      const ingestResponse = await fetch("/api/documents/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId }),
      });

      if (!ingestResponse.ok) {
        const payload = await ingestResponse.json().catch(() => ({}));
        console.error(
          "Failed to enqueue ingestion job",
          (payload as { error?: string })?.error ?? ingestResponse.statusText
        );
        setStatus(null);
        router.push("/dashboard/documents");
        return;
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
    <main className="px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-primary">Create</p>
          <h1 className="text-3xl font-bold leading-tight">New Document</h1>
          <p className="text-muted-foreground">
            Add a knowledge document and link it to your bots. Upload content, tag it, and we’ll ingest it for search.
          </p>
        </div>

        <div className="max-w-3xl">
          <DocumentForm
            availableBots={availableBots}
            onSubmit={handleCreate}
            loading={loading}
            status={status}
            error={error}
          />
        </div>
      </div>
    </main>
  );
}
