import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    return NextResponse.json({ error: "No team found" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;

  if (!endpoint) {
    return NextResponse.json(
      { error: "Missing subscription endpoint" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("bot_push_subscriptions")
    .update({ disabled_at: new Date().toISOString() })
    .eq("endpoint", endpoint)
    .eq("user_id", user.id)
    .eq("team_id", teamId);

  if (error) {
    console.error("Failed to disable push subscription:", error.message);
    return NextResponse.json(
      { error: "Failed to disable subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
