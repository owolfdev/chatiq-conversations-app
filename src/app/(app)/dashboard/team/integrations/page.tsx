import { redirect } from "next/navigation";

import IntegrationsClient from "./integrations-client";
import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integrations",
};

type RawIntegrationRow = {
  id: string;
  bot_id: string;
  provider: "line" | "facebook" | "whatsapp";
  status: string;
  display_name: string | null;
  credentials: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  bot_bots?: { name?: string | null; slug?: string | null } | Array<{
    name?: string | null;
    slug?: string | null;
  }> | null;
};

function maskCredentials(
  credentials: Record<string, unknown>
): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  Object.entries(credentials || {}).forEach(([key, value]) => {
    if (typeof value === "string" && /secret|token/i.test(key)) {
      const last4 = value.slice(-4);
      masked[key] = `****${last4}`;
      return;
    }
    masked[key] = value;
  });
  return masked;
}

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in?redirect=/dashboard/team/integrations");
  }

  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    redirect("/not-authorized");
  }

  const { data: membership } = await supabase
    .from("bot_team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/not-authorized");
  }

  const [{ data: team }, { data: bots }, { data: integrations }] =
    await Promise.all([
      supabase.from("bot_teams").select("name").eq("id", teamId).maybeSingle(),
      supabase
        .from("bot_bots")
        .select("id, name, slug")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false }),
      supabase
        .from("bot_integrations")
        .select(
          "id, bot_id, provider, status, display_name, credentials, created_at, updated_at, bot_bots(name, slug)"
        )
        .eq("team_id", teamId)
        .order("created_at", { ascending: false }),
    ]);

  const initialIntegrations =
    (integrations as RawIntegrationRow[] | null)?.map((row) => {
      const botRecord = Array.isArray(row.bot_bots)
        ? row.bot_bots[0]
        : row.bot_bots;

      return {
        id: row.id,
        bot_id: row.bot_id,
        provider: row.provider,
        status: row.status,
        display_name: row.display_name,
        credentials: maskCredentials(row.credentials || {}),
        created_at: row.created_at,
        updated_at: row.updated_at,
        bot: botRecord ? { name: botRecord.name, slug: botRecord.slug } : null,
      };
    }) ?? [];

  return (
    <IntegrationsClient
      teamName={team?.name ?? null}
      initialBots={bots ?? []}
      initialIntegrations={initialIntegrations}
    />
  );
}
