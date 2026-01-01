// src/app/dashboard/documents/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { getTeamPlan, type PlanId } from "@/lib/teams/usage";
import { PLAN_QUOTAS } from "@/lib/plans/quotas";
import DocumentsClient from "./documents-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documents",
};

type DocumentRow = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  is_global: boolean;
  is_flagged: boolean;
  canonical_url?: string | null;
  bot_document_links?:
    | {
        bot_id: string;
        bot_bots?:
          | {
              name?: string | null;
            }
          | {
              name?: string | null;
            }[];
      }[]
    | null;
};

function formatDocuments(
  rows: DocumentRow[] | null | undefined,
  ownership: "team" | "personal"
) {
  if (!rows?.length) return [];
  return rows.map((doc) => {
    const chatbots =
      doc.bot_document_links
        ?.map((link) => {
          const bot =
            link.bot_bots && Array.isArray(link.bot_bots)
              ? link.bot_bots[0]
              : link.bot_bots;
          return bot?.name ?? null;
        })
        .filter(
          (name): name is string =>
            typeof name === "string" && name.length > 0
        ) || [];

    return {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      tags: doc.tags,
      created_at: doc.created_at,
      is_global: doc.is_global,
      is_flagged: doc.is_flagged ?? false,
      canonical_url: doc.canonical_url,
      name: doc.title,
      size: `${(doc.content.length / 1024).toFixed(1)} KB`,
      uploadDate: new Date(doc.created_at).toLocaleDateString(),
      pages: Math.ceil(doc.content.length / 1000),
      status: "Ready",
      chatbots,
      ownership,
    };
  });
}

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in?redirect=/dashboard/documents");
  }

  const teamId = await getUserTeamId(user.id);
  let plan: PlanId = "free";

  if (teamId) {
    plan = await getTeamPlan(teamId);
  }

  const teamDocsPromise = teamId
    ? supabase
        .from("bot_documents")
        .select(
          "id, title, content, tags, created_at, is_global, canonical_url, is_flagged, bot_document_links(bot_id, bot_bots(name))"
        )
        .eq("team_id", teamId)
    : Promise.resolve({ data: [] as DocumentRow[], error: null });

  const personalDocsPromise = supabase
    .from("bot_documents")
    .select(
      "id, title, content, tags, created_at, is_global, canonical_url, is_flagged, bot_document_links(bot_id, bot_bots(name))"
    )
    .eq("user_id", user.id)
    .is("team_id", null);

  const teamMetaPromise = teamId
    ? supabase
        .from("bot_teams")
        .select("name")
        .eq("id", teamId)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [{ data: teamRows }, { data: personalRows }, { data: teamMeta }] =
    await Promise.all([teamDocsPromise, personalDocsPromise, teamMetaPromise]);

  const documentLimit = PLAN_QUOTAS[plan]?.documents ?? null;

  return (
    <DocumentsClient
      initialTeamDocuments={formatDocuments(teamRows as DocumentRow[], "team")}
      initialPersonalDocuments={formatDocuments(
        personalRows as DocumentRow[],
        "personal"
      )}
      teamName={teamMeta?.name ?? null}
      documentLimit={documentLimit}
      plan={plan}
    />
  );
}
