Notifications (Conversations + Bookings)

Overview
- The shell app stores browser push subscriptions and user notification preferences.
- Actual push delivery for new conversations/bookings is handled by the main app (or
  backend jobs) using the subscription + preference data in Supabase.
- The service worker in this repo renders the notification payload and routes clicks
  back into the shell UI.

Data Model (Supabase)
- bot_push_subscriptions
  - Stores a browser endpoint + keys for each user/team device.
  - Created/updated by the shell app when a user enables push.
- bot_notification_preferences
  - Per-user/team flags:
    - push_enabled
    - notify_conversations
    - notify_bookings

Tables are defined in:
- supabase/migrations/20260220000001_create_push_notifications.sql

Client Flow (Shell App)
1) User opens Settings and enables Push Notifications.
2) The browser registers /sw.js and requests notification permission.
3) The VAPID public key (NEXT_PUBLIC_VAPID_PUBLIC_KEY) is used to create a
   PushSubscription via PushManager.
4) The subscription is POSTed to /api/push/subscribe and stored in Supabase.
5) User toggles "New Conversations" or "New Bookings"; preferences are persisted.

Relevant code:
- src/app/(app)/dashboard/settings/settings-client.tsx
- src/app/api/push/subscribe/route.ts
- src/app/actions/notifications/update-notification-preferences.ts

Disabling Push
- Turning off push calls /api/push/unsubscribe and disables the subscription
  by setting disabled_at.
- The browser subscription is unsubscribed afterward.

Relevant code:
- src/app/api/push/unsubscribe/route.ts

Notification Payload + Rendering
The service worker expects a JSON payload with optional fields:
{
  title: string,
  body: string,
  icon: string,
  badge: string,
  url: string,
  tag: string
}

Defaults:
- title: "ChatIQ Inbox"
- body: "You have a new update."
- icon/badge: "/icon-192.png"
- url: "/conversations"
- tag: "chatiq-update"

Click behavior:
- Focuses an existing window at the target URL or opens a new one.

Service worker:
- public/sw.js

Conversation + Booking Triggers
- New conversation or booking events are emitted by the main app.
- The main app should:
  - Fetch enabled subscriptions for the team.
  - Filter by bot_notification_preferences:
    - push_enabled must be true
    - notify_conversations or notify_bookings must be true, depending on event
  - Send a Web Push payload that the shell service worker can render.

Shell App Boundaries
- The shell does not send push notifications itself.
- It only collects subscriptions/preferences and displays the push payload.

Environment
- NEXT_PUBLIC_VAPID_PUBLIC_KEY must be set in the shell app for subscription.
- The server-side VAPID private key is expected wherever push is sent (main app).
