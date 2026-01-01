"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import "highlight.js/styles/github-dark.css";

interface DocumentData {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  user_id: string;
  is_global: boolean;
}

export default function Page() {
  const { id } = useParams();
  const supabase = createClient();
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bot_documents")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setError("Document not found or error loading data.");
      } else {
        setDoc(data);
      }
      setLoading(false);
    })();
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-red-600 font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{doc.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ReactMarkdown
            // className="prose dark:prose-invert max-w-none"
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {doc.content}
          </ReactMarkdown>
        </CardContent>
      </Card>
    </div>
  );
}
