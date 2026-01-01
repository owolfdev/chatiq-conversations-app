import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/utils/supabase/admin";
import { processLineIntegrationEvents } from "@/lib/integrations/line/process-line-events";

export const runtime = "nodejs";

type LineEvent = {
  type?: string;
  replyToken?: string;
  message?: { type?: string; text?: string; id?: string };
  source?: { groupId?: string; roomId?: string; userId?: string };
  webhookEventId?: string;
};

type IntegrationRecord = {
  id: string;
  team_id: string;
  bot_id: string;
  provider: string;
  status: string;
  credentials: Record<string, unknown> | null;
};

function resolveConversationKey(event: LineEvent): string | null {
  return (
    event.source?.groupId ||
    event.source?.roomId ||
    event.source?.userId ||
    null
  );
}

function isValidSignature(signature: string, expected: string): boolean {
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (signatureBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(signatureBuf, expectedBuf);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params;
  const supabase = createAdminClient();

  const { data: integration, error } = await supabase
    .from("bot_integrations")
    .select("id, team_id, bot_id, provider, status, credentials")
    .eq("id", integrationId)
    .maybeSingle();

  if (error || !integration || integration.provider !== "line") {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  if (integration.status !== "active") {
    return NextResponse.json({ error: "Integration disabled" }, { status: 404 });
  }

  const signature = req.headers.get("x-line-signature") || "";
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const rawBody = Buffer.from(await req.arrayBuffer());
  const credentials = (integration as IntegrationRecord).credentials || {};
  const channelSecret = credentials.channel_secret;

  if (!channelSecret || typeof channelSecret !== "string") {
    console.error("[line:webhook] Missing channel_secret", {
      integrationId,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const expectedSignature = createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");

  if (!isValidSignature(signature, expectedSignature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { events?: LineEvent[] } = {};
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch (parseError) {
    console.error("[line:webhook] Failed to parse payload", {
      integrationId,
      error: parseError,
    });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const events = Array.isArray(payload.events) ? payload.events : [];
  const rows = events
    .filter(
      (event) =>
        event.type === "message" && event.message?.type === "text"
    )
    .map((event) => {
      const conversationKey = resolveConversationKey(event);
      return {
        integration_id: integration.id,
        team_id: integration.team_id,
        bot_id: integration.bot_id,
        provider: "line",
        provider_event_id:
          event.message?.id || event.webhookEventId || event.replyToken || null,
        event_type: event.type || null,
        conversation_key: conversationKey,
        reply_token: event.replyToken || null,
        payload: event,
        status: "pending",
      };
    });

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("bot_integration_events")
      .upsert(rows, {
        onConflict: "integration_id,provider_event_id",
      });

    if (insertError) {
      console.error("[line:webhook] Failed to store events", {
        integrationId,
        error: insertError,
      });
    } else {
      try {
        await processLineIntegrationEvents({
          batchSize: Math.min(rows.length, 5),
          workerId: "line:webhook",
        });
      } catch (processError) {
        console.error("[line:webhook] Failed to process events", {
          integrationId,
          error: processError,
        });
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
