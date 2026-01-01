# LINE Integration Guide

## Quickstart

1) Create a LINE Official Account + Messaging API channel.
2) In ChatIQ, create a LINE integration (provider: `line`) and store:
   - `channel_id`
   - `channel_secret`
   - `channel_access_token` (long-lived)
3) Copy the integration `id` and set the LINE webhook URL:
   `https://www.chatiq.io/api/integrations/line/webhook/<integrationId>`
4) Turn ON "Use webhook" in LINE Messaging API settings.
5) Run the LINE worker (always-on) to process inbound events:
   `POST https://www.chatiq.io/api/integrations/line/process`
6) Send a test message to your LINE Official Account.

---

## Overview

ChatIQ treats LINE as a channel (like web embed) rather than a special bot. Each LINE Official Account maps to a single ChatIQ bot via a `bot_integrations` record. Incoming LINE webhook events are verified and stored, then a worker processes them and sends replies through the LINE Reply API.

Key properties:
- Multi-tenant ready (per-team credentials)
- Node.js runtime (crypto required)
- Secrets never exposed to frontend
- Webhook is ingress-only (fast response)

---

## Data Model

### bot_integrations
Stores per-bot integration credentials.

Fields (relevant):
- `id` (uuid) — integrationId in webhook URL
- `team_id`, `bot_id`
- `provider` — `line`
- `credentials` — JSON with LINE keys

Example credentials JSON:
```json
{
  "channel_id": "200...",
  "channel_secret": "95be...",
  "channel_access_token": "KqX..."
}
```

### bot_integration_events
Queue for inbound webhook events.

Fields (relevant):
- `integration_id`, `team_id`, `bot_id`
- `provider_event_id` (LINE message id)
- `conversation_key` (group/room/user id)
- `payload` (raw LINE event)
- `status` (`pending` → `processing` → `done`/`failed`)

---

## Webhook Flow

Endpoint:
```
POST /api/integrations/line/webhook/[integrationId]
```

Steps:
1) Read raw body (do not parse JSON first).
2) Verify `x-line-signature` using HMAC-SHA256 with `channel_secret`.
3) Parse JSON and filter `message` + `text` events only.
4) Insert events into `bot_integration_events`.
5) Return `200 OK` immediately.

Notes:
- Webhook response is to LINE’s servers, not the end-user.
- Duplicate deliveries are handled via unique `(integration_id, provider_event_id)`.

---

## Worker Flow (Always-On)

Endpoint:
```
POST /api/integrations/line/process
```

The worker:
1) Pulls `pending` LINE events.
2) Resolves `conversation_key` (groupId → roomId → userId).
3) Creates or finds `bot_conversations` by `session_id`.
4) Calls ChatIQ pipeline (`handleChatRequest`).
5) Sends reply using LINE Reply API.
6) Marks event `done` or `failed`.

Recommended cadence:
- Always-on loop (1–2s) for real-time UX.

---

## Worker Security

Set a custom secret:
- `LINE_INTEGRATION_WORKER_SECRET`

Worker calls must include:
```
x-line-worker-secret: <secret>
```

This is not a LINE credential. You generate it yourself.

---

## How to Create an Integration (SQL)

```sql
insert into public.bot_integrations (
  team_id,
  bot_id,
  provider,
  status,
  display_name,
  credentials
) values (
  'YOUR_TEAM_ID',
  'YOUR_BOT_ID',
  'line',
  'active',
  'LINE Official Account',
  jsonb_build_object(
    'channel_id', 'YOUR_CHANNEL_ID',
    'channel_secret', 'YOUR_CHANNEL_SECRET',
    'channel_access_token', 'YOUR_CHANNEL_ACCESS_TOKEN'
  )
)
returning id;
```

The returned `id` is your `integrationId`.

---

## LINE Console Settings

In the LINE OA Manager:
- Messaging API → Webhook URL:
  `https://www.chatiq.io/api/integrations/line/webhook/<integrationId>`
- Enable "Use webhook".
- Verify connection (should return success).

---

## Troubleshooting

### Webhook verification fails
- Ensure `channel_secret` is correct.
- Ensure raw body is used for signature verification.
- Confirm the URL uses the correct integrationId.

### No replies in LINE
- Check the worker is running.
- Check `bot_integration_events` for `pending/failed` rows.
- Verify `channel_access_token` is valid and long-lived.

### Delayed replies
- Reduce worker sleep interval (1–2s recommended).
- Verify your hosting provider allows frequent worker calls.

---

## Best Practices

- Use plain text responses for LINE (avoid Markdown).
- Keep webhook fast and stateless.
- Use always-on worker for near real-time replies.
- Don’t log secrets.
- Store `source` + `source_detail` to track channel analytics.

---

## Reference Endpoints

- Webhook: `POST /api/integrations/line/webhook/[integrationId]`
- Worker: `POST /api/integrations/line/process`
- Integrations API: `GET/POST /api/integrations`
- Integrations API: `PATCH/DELETE /api/integrations/[id]`
