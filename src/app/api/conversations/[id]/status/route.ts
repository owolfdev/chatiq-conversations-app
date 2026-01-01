import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

type StatusPayload = {
  status?: "resolved" | "unresolved";
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: StatusPayload = {};
  try {
    payload = (await req.json()) as StatusPayload;
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
  }

  const status = payload.status;
  if (status !== "resolved" && status !== "unresolved") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: conversation, error: convoError } = await admin
    .from("bot_conversations")
    .select("id, team_id")
    .eq("id", id)
    .maybeSingle();

  if (convoError || !conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("bot_team_members")
    .select("id")
    .eq("team_id", conversation.team_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: team } = await supabase
    .from("bot_teams")
    .select("owner_id")
    .eq("id", conversation.team_id)
    .maybeSingle();

  const isTeamMember = Boolean(membership || team?.owner_id === user.id);
  if (!isTeamMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: updateError } = await admin
    .from("bot_conversations")
    .update({
      resolution_status: status,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, status });
}
