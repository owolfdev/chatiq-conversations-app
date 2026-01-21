Shell App Routes

UI Routes
- /conversations: Requires auth; renders the conversations list UI and fetches data from the main app API.
- /conversations/[id]: Requires auth and team membership; loads conversation metadata + messages from Supabase and enables live updates + actions.
- /bookings: Requires auth; renders the bookings list UI and fetches data from the main app API.
- /bookings/[id]: Requires auth; shows booking details and actions driven by main app API responses.

Conversations API (proxied to main app)
- GET /api/conversations
  - Used by the list view with query params:
    - limit (default 50)
    - sortBy (last_message_at)
    - sortDir (desc)
    - botId, topic, status, source
    - userQuery (customer search)
    - detailQuery (secondary search)
- GET /api/conversations/:id/messages
- POST /api/conversations/:id/messages
  - Body: { "content": string }
- POST /api/conversations/:id/takeover
  - Body: { "enabled": boolean }
- POST /api/conversations/:id/status
  - Body: { "status": "resolved" | "unresolved" }
- POST /api/conversations/:id/topic
  - Body: { "topic": string }
- GET /api/conversations/:id/export?format=csv|json
- POST /api/integrations/line/send
  - Used when a conversation source is LINE.
  - Body: { "conversation_id": string, "message": string }

Bookings API (proxied to main app)
- GET /api/bookings
  - Query params:
    - workflowId (optional)
    - status (optional)
    - referenceQuery (optional)
- GET /api/bookings/workflows
- GET /api/bookings/:id
- POST /api/bookings/:id/confirm
  - Body: {
      "confirmationMessage": string,
      "appointmentDate": string | null,
      "appointmentTimezone": string | null
    }
- POST /api/bookings/delete
  - Body: { "bookingIds": string[] }

Local Supabase Operations
- Conversation detail loads conversation metadata, messages, and team membership in the shell server route.
- Conversation delete uses a server action against Supabase (not proxied).
- Realtime updates for messages + takeover status use Supabase channels.

Polling/Refresh Behavior
- Conversations list: refreshes every 8s while visible; manual refresh + active-team change event.
- Conversation detail: polls messages every 5s and also listens to realtime inserts/updates.
- Bookings list: refreshes every 8s while visible; manual refresh + active-team change event.
