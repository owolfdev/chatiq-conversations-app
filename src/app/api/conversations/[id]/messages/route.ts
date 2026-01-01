import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(
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

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
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

  const { data: messages, error: messageError } = await admin
    .from("bot_messages")
    .select("id, sender, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (messageError || !messages) {
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }

  return NextResponse.json({ messages });
}

type CreateMessagePayload = {
  content?: string;
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

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
  }

  let payload: CreateMessagePayload = {};
  try {
    payload = (await req.json()) as CreateMessagePayload;
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const content =
    typeof payload.content === "string" ? payload.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "Message content required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: conversation, error: convoError } = await admin
    .from("bot_conversations")
    .select("id, team_id, source")
    .eq("id", id)
    .maybeSingle();

  if (convoError || !conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (conversation.source === "line") {
    return NextResponse.json(
      { error: "Use LINE send endpoint for LINE conversations" },
      { status: 400 }
    );
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

  const { error: messageError } = await admin.from("bot_messages").insert({
    conversation_id: id,
    sender: "bot",
    content,
  });

  if (messageError) {
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }

  const takeoverUntil = new Date(Date.now() + 300_000).toISOString();
  await admin
    .from("bot_conversations")
    .update({
      human_takeover: true,
      human_takeover_until: takeoverUntil,
    })
    .eq("id", id);

  return NextResponse.json({ ok: true, human_takeover_until: takeoverUntil });
}
