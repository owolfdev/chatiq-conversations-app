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
  const subscription = body?.subscription;

  if (
    !subscription?.endpoint ||
    !subscription?.keys?.p256dh ||
    !subscription?.keys?.auth
  ) {
    return NextResponse.json(
      { error: "Invalid subscription payload" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("bot_push_subscriptions").upsert(
    {
      user_id: user.id,
      team_id: teamId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: typeof body?.userAgent === "string" ? body.userAgent : null,
      last_seen: new Date().toISOString(),
      disabled_at: null,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("Failed to store push subscription:", error.message);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
