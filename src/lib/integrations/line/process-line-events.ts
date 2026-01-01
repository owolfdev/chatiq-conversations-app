import { handleChatRequest } from "@/lib/chat/handle-chat-requests";
import { createAdminClient } from "@/utils/supabase/admin";

const DEFAULT_BATCH_SIZE = 5;

type LineSource = {
  userId?: string;
  groupId?: string;
  roomId?: string;
};

type LinePayload = {
  message?: { text?: string };
  source?: LineSource;
};

type IntegrationEventRow = {
  id: string;
  integration_id: string;
  team_id: string;
  bot_id: string;
  conversation_key: string | null;
  reply_token: string | null;
  payload: LinePayload | null;
  attempts: number;
};

type IntegrationRecord = {
  id: string;
  provider: string;
  status: string;
  credentials: Record<string, unknown> | null;
};

type BotRecord = {
  id: string;
  slug: string | null;
};

type LineDestination = {
  accessToken: string;
  to: string;
};

type LineQuickReply = {
  label: string;
  text: string;
};

async function getOrCreateConversationId({
  supabase,
  botId,
  teamId,
  conversationKey,
  title,
  sourceDetail,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  botId: string;
  teamId: string;
  conversationKey: string;
  title: string;
  sourceDetail?: Record<string, unknown>;
}): Promise<string> {
  const { data: existing } = await supabase
    .from("bot_conversations")
    .select("id, source_detail")
    .eq("bot_id", botId)
    .eq("session_id", conversationKey)
    .maybeSingle();

  if (existing?.id) {
    if (sourceDetail) {
      const currentDetail =
        existing.source_detail && typeof existing.source_detail === "object"
          ? (existing.source_detail as Record<string, unknown>)
          : {};
      let shouldUpdate = false;
      for (const [key, value] of Object.entries(sourceDetail)) {
        if (
          value !== null &&
          value !== undefined &&
          currentDetail[key] !== value
        ) {
          currentDetail[key] = value;
          shouldUpdate = true;
        }
      }
      if (shouldUpdate) {
        await supabase
          .from("bot_conversations")
          .update({ source_detail: currentDetail })
          .eq("id", existing.id);
      }
    }
    return existing.id;
  }

  const { data, error } = await supabase
    .from("bot_conversations")
    .insert({
      bot_id: botId,
      team_id: teamId,
      title,
      session_id: conversationKey,
      source: "line",
      source_detail: sourceDetail ?? { conversation_key: conversationKey },
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error("Failed to create conversation");
  }

  return data.id;
}

async function fetchLineProfile({
  accessToken,
  source,
}: {
  accessToken: string;
  source?: LineSource;
}): Promise<
  | {
      userId: string;
      displayName?: string;
      pictureUrl?: string;
      statusMessage?: string;
    }
  | null
> {
  if (!source?.userId) {
    return null;
  }

  let url = "";
  if (source.groupId) {
    url = `https://api.line.me/v2/bot/group/${source.groupId}/member/${source.userId}`;
  } else if (source.roomId) {
    url = `https://api.line.me/v2/bot/room/${source.roomId}/member/${source.userId}`;
  } else {
    url = `https://api.line.me/v2/bot/profile/${source.userId}`;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as {
      displayName?: string;
      pictureUrl?: string;
      statusMessage?: string;
    };
    return {
      userId: source.userId,
      displayName: data.displayName,
      pictureUrl: data.pictureUrl,
      statusMessage: data.statusMessage,
    };
  } catch (error) {
    console.error("[line:worker] Failed to fetch profile", {
      error,
    });
    return null;
  }
}

async function sendLineReply({
  accessToken,
  replyToken,
  message,
  quickReplies,
}: {
  accessToken: string;
  replyToken: string;
  message: string;
  quickReplies?: LineQuickReply[];
}): Promise<{ ok: boolean; status: number; body: string }> {
  const quickReplyPayload =
    quickReplies && quickReplies.length > 0
      ? {
          quickReply: {
            items: quickReplies.map((reply) => ({
              type: "action",
              action: {
                type: "message",
                label: reply.label,
                text: reply.text,
              },
            })),
          },
        }
      : {};
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: message, ...quickReplyPayload }],
    }),
  });
  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

async function sendLinePush({
  accessToken,
  to,
  message,
  quickReplies,
}: {
  accessToken: string;
  to: string;
  message: string;
  quickReplies?: LineQuickReply[];
}): Promise<{ ok: boolean; status: number; body: string }> {
  const quickReplyPayload =
    quickReplies && quickReplies.length > 0
      ? {
          quickReply: {
            items: quickReplies.map((reply) => ({
              type: "action",
              action: {
                type: "message",
                label: reply.label,
                text: reply.text,
              },
            })),
          },
        }
      : {};
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text: message, ...quickReplyPayload }],
    }),
  });
  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

function stripBoldMarkdown(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, "$1");
}

function isTakeoverActive({
  humanTakeover,
  humanTakeoverUntil,
}: {
  humanTakeover: boolean | null;
  humanTakeoverUntil: string | null;
}): boolean {
  if (!humanTakeover) {
    return false;
  }
  if (!humanTakeoverUntil) {
    return true;
  }
  return new Date(humanTakeoverUntil).getTime() > Date.now();
}

async function getLineDestination({
  supabase,
  conversationId,
  botId,
  sessionId,
  sourceDetail,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  conversationId: string;
  botId: string;
  sessionId: string | null;
  sourceDetail: Record<string, unknown>;
}): Promise<LineDestination | null> {
  const { data: integration } = await supabase
    .from("bot_integrations")
    .select("credentials, status, provider")
    .eq("bot_id", botId)
    .eq("provider", "line")
    .eq("status", "active")
    .maybeSingle();

  const accessToken = integration?.credentials?.channel_access_token;
  if (!accessToken || typeof accessToken !== "string") {
    console.error("[line:worker] Missing LINE access token", {
      conversationId,
    });
    return null;
  }

  const to =
    (typeof sourceDetail.line_user_id === "string" &&
      sourceDetail.line_user_id) ||
    (typeof sourceDetail.line_group_id === "string" &&
      sourceDetail.line_group_id) ||
    (typeof sourceDetail.line_room_id === "string" &&
      sourceDetail.line_room_id) ||
    sessionId;

  if (!to) {
    console.error("[line:worker] Missing LINE destination", {
      conversationId,
    });
    return null;
  }

  return { accessToken, to };
}

async function handleExpiredTakeovers({
  supabase,
  batchSize = 10,
  workerId,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  batchSize?: number;
  workerId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const { data: expiredConversations, error } = await supabase
    .from("bot_conversations")
    .select("id, bot_id, session_id, source_detail, human_takeover_until")
    .eq("source", "line")
    .eq("human_takeover", true)
    .lt("human_takeover_until", now)
    .order("human_takeover_until", { ascending: true })
    .limit(batchSize);

  if (error || !expiredConversations?.length) {
    return;
  }

  for (const conversation of expiredConversations) {
    await supabase
      .from("bot_conversations")
      .update({ human_takeover: false, human_takeover_until: null })
      .eq("id", conversation.id);

    const { data: lastMessage } = await supabase
      .from("bot_messages")
      .select("sender, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastMessage || lastMessage.sender !== "user") {
      continue;
    }

    const messageText = lastMessage.content?.trim();
    if (!messageText) {
      continue;
    }

    const { data: bot } = await supabase
      .from("bot_bots")
      .select("id, slug")
      .eq("id", conversation.bot_id)
      .maybeSingle();

    if (!bot?.slug) {
      continue;
    }

    const sourceDetail =
      conversation.source_detail && typeof conversation.source_detail === "object"
        ? (conversation.source_detail as Record<string, unknown>)
        : {};

    const destination = await getLineDestination({
      supabase,
      conversationId: conversation.id,
      botId: conversation.bot_id,
      sessionId: conversation.session_id ?? null,
      sourceDetail,
    });

    if (!destination) {
      continue;
    }

    const result = await handleChatRequest({
      message: messageText,
      bot_slug: bot.slug,
      bot_id: conversation.bot_id,
      conversation_id: conversation.id,
      isInternal: true,
      source: "line",
      source_detail: sourceDetail,
      private_mode: true,
    });

    const responseText = result.response?.trim();
    if (!responseText) {
      continue;
    }

    await supabase.from("bot_messages").insert({
      conversation_id: conversation.id,
      sender: "bot",
      content: responseText,
    });

    const pushed = await sendLinePush({
      accessToken: destination.accessToken,
      to: destination.to,
      message: stripBoldMarkdown(responseText),
    });

    if (!pushed.ok) {
      console.error("[line:worker] Failed to send timeout reply", {
        conversationId: conversation.id,
        workerId,
      });
    }
  }
}

export async function processLineIntegrationEvents({
  batchSize = DEFAULT_BATCH_SIZE,
  workerId = "line-integration-worker",
}: {
  batchSize?: number;
  workerId?: string;
}): Promise<{ processed: number; failed: number }> {
  const supabase = createAdminClient();

  const { data: events, error } = await supabase
    .from("bot_integration_events")
    .select(
      "id, integration_id, team_id, bot_id, conversation_key, reply_token, payload, attempts"
    )
    .eq("provider", "line")
    .eq("status", "pending")
    .order("received_at", { ascending: true })
    .limit(batchSize);

  if (error || !events) {
    console.error("[line:worker] Failed to load events", {
      error,
    });
    return { processed: 0, failed: 0 };
  }

  const botSlugCache = new Map<string, string>();
  const integrationCache = new Map<string, IntegrationRecord>();

  let processed = 0;
  let failed = 0;

  for (const event of events as IntegrationEventRow[]) {
    const { data: locked } = await supabase
      .from("bot_integration_events")
      .update({
        status: "processing",
        attempts: (event.attempts ?? 0) + 1,
      })
      .eq("id", event.id)
      .eq("status", "pending")
      .select("id")
      .single();

    if (!locked) {
      continue;
    }

    try {
      const messageText = event.payload?.message?.text?.trim();
      if (!messageText) {
        await supabase
          .from("bot_integration_events")
          .update({
            status: "done",
            processed_at: new Date().toISOString(),
          })
          .eq("id", event.id);
        processed += 1;
        continue;
      }

      let integration = integrationCache.get(event.integration_id);
      if (!integration) {
        const { data: integrationData, error: integrationError } = await supabase
          .from("bot_integrations")
          .select("id, provider, status, credentials")
          .eq("id", event.integration_id)
          .maybeSingle();

        if (integrationError || !integrationData) {
          throw new Error("Integration not found");
        }

        integration = integrationData as IntegrationRecord;
        integrationCache.set(event.integration_id, integration);
      }

      if (integration.status !== "active" || integration.provider !== "line") {
        throw new Error("Integration disabled or invalid provider");
      }

      const accessToken = integration.credentials?.channel_access_token;
      if (!accessToken || typeof accessToken !== "string") {
        throw new Error("Missing channel_access_token");
      }

      let botSlug = botSlugCache.get(event.bot_id);
      if (!botSlug) {
        const { data: bot, error: botError } = await supabase
          .from("bot_bots")
          .select("id, slug")
          .eq("id", event.bot_id)
          .single();

        const slug = bot?.slug;
        if (botError || !slug) {
          throw new Error("Bot slug not found");
        }

        botSlug = slug;
        botSlugCache.set(event.bot_id, slug);
      }

      const conversationKey = event.conversation_key;
      if (!conversationKey) {
        throw new Error("Missing conversation key");
      }

      const source = event.payload?.source;
      const profile = await fetchLineProfile({ accessToken, source });
      const sourceDetail: Record<string, unknown> = {
        conversation_key: conversationKey,
        line_user_id: source?.userId ?? null,
        line_group_id: source?.groupId ?? null,
        line_room_id: source?.roomId ?? null,
        label: "Line Official Account",
      };
      if (profile?.displayName) {
        sourceDetail.line_display_name = profile.displayName;
      }
      if (profile?.pictureUrl) {
        sourceDetail.line_picture_url = profile.pictureUrl;
      }
      if (profile?.statusMessage) {
        sourceDetail.line_status_message = profile.statusMessage;
      }

      const conversationId = await getOrCreateConversationId({
        supabase,
        botId: event.bot_id,
        teamId: event.team_id,
        conversationKey,
        title: messageText,
        sourceDetail,
      });

      const { data: convoState } = await supabase
        .from("bot_conversations")
        .select("human_takeover, human_takeover_until")
        .eq("id", conversationId)
        .maybeSingle();

      if (convoState?.human_takeover && convoState.human_takeover_until) {
        const expired =
          new Date(convoState.human_takeover_until).getTime() <= Date.now();
        if (expired) {
          await supabase
            .from("bot_conversations")
            .update({
              human_takeover: false,
              human_takeover_until: null,
            })
            .eq("id", conversationId);
        }
      }

      if (
        convoState &&
        isTakeoverActive({
          humanTakeover: convoState.human_takeover,
          humanTakeoverUntil: convoState.human_takeover_until,
        })
      ) {
        const takeoverResult = await handleChatRequest({
          message: messageText,
          bot_slug: botSlug,
          bot_id: event.bot_id,
          conversation_id: conversationId,
          isInternal: true,
          source: "line",
          source_detail: sourceDetail,
        });

        if (takeoverResult.response?.trim()) {
          const outgoing = stripBoldMarkdown(takeoverResult.response.trim());
          let replied = false;
          if (event.reply_token) {
            const replyResult = await sendLineReply({
              accessToken,
              replyToken: event.reply_token,
              message: outgoing,
              quickReplies: takeoverResult.lineQuickReplies,
            });
            replied = replyResult.ok;
            if (!replyResult.ok) {
              await supabase
                .from("bot_integration_events")
                .update({
                  last_error: `LINE reply failed (${replyResult.status}): ${replyResult.body}`,
                })
                .eq("id", event.id);
            }
          }

          if (!replied) {
            const pushTarget =
              event.conversation_key ||
              (typeof sourceDetail.line_user_id === "string"
                ? sourceDetail.line_user_id
                : null);
            if (pushTarget) {
              const pushResult = await sendLinePush({
                accessToken,
                to: pushTarget,
                message: outgoing,
                quickReplies: takeoverResult.lineQuickReplies,
              });
              if (!pushResult.ok) {
                console.error(
                  "[line:worker] Failed to send LINE response during takeover",
                  {
                    eventId: event.id,
                    workerId,
                  }
                );
                await supabase
                  .from("bot_integration_events")
                  .update({
                    last_error: `LINE push failed (${pushResult.status}): ${pushResult.body}`,
                  })
                  .eq("id", event.id);
              }
            }
          }
        }

        await supabase
          .from("bot_integration_events")
          .update({
            status: "done",
            processed_at: new Date().toISOString(),
          })
          .eq("id", event.id);
        processed += 1;
        continue;
      }

      const result = await handleChatRequest({
        message: messageText,
        bot_slug: botSlug,
        bot_id: event.bot_id,
        conversation_id: conversationId,
        isInternal: true,
        source: "line",
        source_detail: sourceDetail,
      });

      if (result.response?.trim()) {
        const outgoing = stripBoldMarkdown(result.response.trim());
        let replied = false;
        if (event.reply_token) {
          const replyResult = await sendLineReply({
            accessToken,
            replyToken: event.reply_token,
            message: outgoing,
            quickReplies: result.lineQuickReplies,
          });
          replied = replyResult.ok;
          if (!replyResult.ok) {
            await supabase
              .from("bot_integration_events")
              .update({
                last_error: `LINE reply failed (${replyResult.status}): ${replyResult.body}`,
              })
              .eq("id", event.id);
          }
        }

        if (!replied) {
          const pushTarget =
            event.conversation_key ||
            (typeof sourceDetail.line_user_id === "string"
              ? sourceDetail.line_user_id
              : null);
          if (pushTarget) {
            const pushResult = await sendLinePush({
              accessToken,
              to: pushTarget,
              message: outgoing,
              quickReplies: result.lineQuickReplies,
            });
            if (!pushResult.ok) {
              console.error("[line:worker] Failed to send LINE response", {
                eventId: event.id,
                workerId,
              });
              await supabase
                .from("bot_integration_events")
                .update({
                  last_error: `LINE push failed (${pushResult.status}): ${pushResult.body}`,
                })
                .eq("id", event.id);
            }
          }
        }
      }

      await supabase
        .from("bot_integration_events")
        .update({
          status: "done",
          processed_at: new Date().toISOString(),
        })
        .eq("id", event.id);

      processed += 1;
    } catch (processError) {
      failed += 1;
      console.error("[line:worker] Failed to process event", {
        eventId: event.id,
        error: processError,
        workerId,
      });

      await supabase
        .from("bot_integration_events")
        .update({
          status: "failed",
          last_error:
            processError instanceof Error
              ? processError.message
              : String(processError),
          processed_at: new Date().toISOString(),
        })
        .eq("id", event.id);
    }
  }

  await handleExpiredTakeovers({ supabase, workerId });

  return { processed, failed };
}
