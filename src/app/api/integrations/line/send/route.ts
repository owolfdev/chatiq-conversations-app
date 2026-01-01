import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

type SendLinePayload = {
  conversation_id?: string;
  message?: string;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: SendLinePayload = {};
  try {
    payload = (await req.json()) as SendLinePayload;
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const conversationId = payload.conversation_id;
  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";

  if (!conversationId || !message) {
    return NextResponse.json(
      { error: "conversation_id and message are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: conversation, error: convoError } = await admin
    .from("bot_conversations")
    .select(
      "id, bot_id, team_id, source, source_detail, human_takeover, human_takeover_until"
    )
    .eq("id", conversationId)
    .maybeSingle();

  if (convoError || !conversation || conversation.source !== "line") {
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

  const { data: integration, error: integrationError } = await admin
    .from("bot_integrations")
    .select("id, credentials, status, provider")
    .eq("bot_id", conversation.bot_id)
    .eq("provider", "line")
    .eq("status", "active")
    .maybeSingle();

  if (integrationError || !integration) {
    return NextResponse.json(
      { error: "LINE integration not found" },
      { status: 404 }
    );
  }

  const accessToken = integration.credentials?.channel_access_token;
  if (!accessToken || typeof accessToken !== "string") {
    return NextResponse.json(
      { error: "Missing LINE access token" },
      { status: 500 }
    );
  }

  const detail =
    conversation.source_detail && typeof conversation.source_detail === "object"
      ? (conversation.source_detail as Record<string, unknown>)
      : {};
  const destination =
    (typeof detail.line_user_id === "string" && detail.line_user_id) ||
    (typeof detail.line_group_id === "string" && detail.line_group_id) ||
    (typeof detail.line_room_id === "string" && detail.line_room_id) ||
    null;

  if (!destination) {
    return NextResponse.json(
      { error: "Missing LINE destination" },
      { status: 400 }
    );
  }

  const pushResponse = await fetch(
    "https://api.line.me/v2/bot/message/push",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: destination,
        messages: [{ type: "text", text: message }],
      }),
    }
  );

  if (!pushResponse.ok) {
    const errorText = await pushResponse.text();
    return NextResponse.json(
      { error: `LINE push failed: ${errorText || "unknown error"}` },
      { status: 502 }
    );
  }

  const { error: messageError } = await admin.from("bot_messages").insert({
    conversation_id: conversationId,
    sender: "bot",
    content: message,
  });

  if (messageError) {
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 }
    );
  }

  const takeoverUntil = new Date(Date.now() + 300_000).toISOString();
  await admin
    .from("bot_conversations")
    .update({
      human_takeover: true,
      human_takeover_until: takeoverUntil,
    })
    .eq("id", conversationId);

  return NextResponse.json({ ok: true, human_takeover_until: takeoverUntil });
}
