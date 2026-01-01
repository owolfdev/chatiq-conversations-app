import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { handleChatRequest } from "@/lib/chat/handle-chat-requests";

type TakeoverPayload = {
  enabled?: boolean;
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

  let payload: TakeoverPayload = {};
  try {
    payload = (await req.json()) as TakeoverPayload;
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing conversation id" }, { status: 400 });
  }

  const enabled = Boolean(payload.enabled);
  const admin = createAdminClient();

  const { data: conversation, error: convoError } = await admin
    .from("bot_conversations")
    .select("id, team_id, source, bot_id, session_id, source_detail")
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

  const update = enabled
    ? {
        human_takeover: true,
        human_takeover_until: new Date(Date.now() + 300_000).toISOString(),
      }
    : {
        human_takeover: false,
        human_takeover_until: null,
      };

  const { error: updateError } = await admin
    .from("bot_conversations")
    .update(update)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update takeover" }, { status: 500 });
  }

  if (!enabled) {
    const { data: lastMessage } = await admin
      .from("bot_messages")
      .select("sender, content")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastMessage?.sender === "user") {
      const messageText = lastMessage.content?.trim();
      if (messageText) {
        const { data: bot } = await admin
          .from("bot_bots")
          .select("id, slug")
          .eq("id", conversation.bot_id)
          .maybeSingle();

        if (bot?.slug) {
          const result = await handleChatRequest({
            message: messageText,
            bot_slug: bot.slug,
            bot_id: conversation.bot_id,
            conversation_id: id,
            isInternal: true,
            private_mode: true,
          });

          const responseText = result.response?.trim();
          if (responseText) {
            await admin.from("bot_messages").insert({
              conversation_id: id,
              sender: "bot",
              content: responseText,
            });

            if (conversation.source === "line") {
              const { data: integration } = await admin
                .from("bot_integrations")
                .select("credentials, status, provider")
                .eq("bot_id", conversation.bot_id)
                .eq("provider", "line")
                .eq("status", "active")
                .maybeSingle();

              const accessToken = integration?.credentials?.channel_access_token;
              if (typeof accessToken === "string" && accessToken) {
                const detail =
                  conversation.source_detail &&
                  typeof conversation.source_detail === "object"
                    ? (conversation.source_detail as Record<string, unknown>)
                    : {};
                const destination =
                  (typeof detail.line_user_id === "string" &&
                    detail.line_user_id) ||
                  (typeof detail.line_group_id === "string" &&
                    detail.line_group_id) ||
                  (typeof detail.line_room_id === "string" &&
                    detail.line_room_id) ||
                  (conversation.session_id as string | null);

                if (destination) {
                  const stripped = responseText.replace(/\*\*(.*?)\*\*/g, "$1");
                  await fetch("https://api.line.me/v2/bot/message/push", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                      to: destination,
                      messages: [{ type: "text", text: stripped }],
                    }),
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    enabled,
    human_takeover_until: update.human_takeover_until ?? null,
  });
}
