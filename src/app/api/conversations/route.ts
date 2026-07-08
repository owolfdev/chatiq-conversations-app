import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { getConversations } from "@/app/actions/conversations/get-conversations";

const SORT_KEYS = new Set([
  "last_message_at",
  "message_count",
  "topic",
  "source",
  "status",
  "user",
]);

const SORT_DIRS = new Set(["asc", "desc"]);

const parseLimit = (value: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return Math.min(Math.max(parsed, 1), 200);
};

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeTeamId = await getUserTeamId(user.id);
  if (!activeTeamId) {
    return NextResponse.json({ conversations: [] });
  }

  const searchParams = req.nextUrl.searchParams;
  const botId = searchParams.get("botId");
  const topic = searchParams.get("topic");
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const userQuery = searchParams.get("userQuery");
  const detailQuery = searchParams.get("detailQuery");
  const sortByRaw = searchParams.get("sortBy");
  const sortDirRaw = searchParams.get("sortDir");
  const limit = parseLimit(searchParams.get("limit"));

  const sortBy = SORT_KEYS.has(sortByRaw ?? "") ? sortByRaw : undefined;
  const sortDir = SORT_DIRS.has(sortDirRaw ?? "") ? sortDirRaw : undefined;
  const statusValue =
    status === "resolved" || status === "unresolved" || status === "all"
      ? status
      : undefined;

  const conversations = await getConversations(activeTeamId, botId, {
    limit,
    topic,
    status: statusValue as "resolved" | "unresolved" | "all" | null,
    source,
    userQuery,
    detailQuery,
    sortBy: sortBy as
      | "last_message_at"
      | "message_count"
      | "topic"
      | "source"
      | "status"
      | "user"
      | undefined,
    sortDir: sortDir as "asc" | "desc" | undefined,
  });

  return NextResponse.json({ conversations });
}
