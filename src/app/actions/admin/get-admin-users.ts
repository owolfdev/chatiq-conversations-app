"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export type AdminUsersSortKey =
  | "created_at"
  | "bot_count"
  | "conversation_count"
  | "document_count"
  | "last_active_at";

export interface GetAdminUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  plan?: string;
  minBots?: number | null;
  maxBots?: number | null;
  minConversations?: number | null;
  maxConversations?: number | null;
  minDocuments?: number | null;
  maxDocuments?: number | null;
  sortKey?: AdminUsersSortKey;
  sortDirection?: "asc" | "desc";
}

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  role: string;
  created_at: string;
  team_id: string | null;
  team_name: string | null;
  bot_count: number;
  conversation_count: number;
  document_count: number;
  last_active_at: string | null;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getAdminUsers({
  page = 1,
  limit = 20,
  search = "",
  plan = "all",
  minBots = null,
  maxBots = null,
  minConversations = null,
  maxConversations = null,
  minDocuments = null,
  maxDocuments = null,
  sortKey = "created_at",
  sortDirection = "desc",
}: GetAdminUsersParams = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [] as AdminUserRow[], total: 0 };
  }

  const { data: profile } = await supabase
    .from("bot_user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return { data: [] as AdminUserRow[], total: 0 };
  }

  const admin = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = admin
    .from("admin_user_overview")
    .select(
      "id, email, full_name, plan, role, created_at, team_id, team_name, bot_count, conversation_count, document_count, last_active_at",
      { count: "exact" }
    );

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    if (UUID_REGEX.test(trimmedSearch)) {
      query = query.eq("id", trimmedSearch);
    } else {
      query = query.or(
        `email.ilike.%${trimmedSearch}%,full_name.ilike.%${trimmedSearch}%`
      );
    }
  }

  if (plan && plan !== "all") {
    query = query.eq("plan", plan);
  }

  if (minBots !== null) {
    query = query.gte("bot_count", minBots);
  }
  if (maxBots !== null) {
    query = query.lte("bot_count", maxBots);
  }
  if (minConversations !== null) {
    query = query.gte("conversation_count", minConversations);
  }
  if (maxConversations !== null) {
    query = query.lte("conversation_count", maxConversations);
  }
  if (minDocuments !== null) {
    query = query.gte("document_count", minDocuments);
  }
  if (maxDocuments !== null) {
    query = query.lte("document_count", maxDocuments);
  }

  query = query.order(sortKey, { ascending: sortDirection === "asc" });

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("Failed to fetch admin users:", error.message);
    return { data: [] as AdminUserRow[], total: 0 };
  }

  return {
    data: (data as AdminUserRow[]) ?? [],
    total: count ?? 0,
  };
}
