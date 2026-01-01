# Conversations App Guide (Standalone)

This document outlines how to build a dedicated, lightweight conversations app using the existing ChatIQ backend. It covers architecture choices, authentication, and the API endpoints you should call.

## 1) Recommended Architecture

**Option A: Internal Support App (recommended)**
- **Auth:** Supabase Auth (same project).
- **Data:** Use existing internal API routes (session-based).
- **Realtime:** Supabase Realtime on `bot_messages` + `bot_conversations`.
- **Use case:** Staff-only inbox, not public.

**Option B: External/Partner App**
- **Auth:** API key (public `v1` endpoints).
- **Data:** `v1` conversation message endpoints + SSE stream.
- **Realtime:** SSE (`/api/v1/conversations/:id/stream`) or polling.

## 2) Authentication

**Internal app:**
- Use Supabase Auth session (same as the main app).
- Requests to `/api/conversations/*` use session cookies for access control.

**External app (public):**
- Pass `Authorization: Bearer <API_KEY>`.
- Use `v1` endpoints only.

## 3) Required API Endpoints

### A) Conversations (internal, session-based)

1) **Get messages**
- `GET /api/conversations/:id/messages`
- Returns: `{ messages: [{ id, sender, content, created_at }] }`

2) **Send human reply (non-LINE)**
- `POST /api/conversations/:id/messages`
- Body: `{ content: string }`
- Behavior: inserts a bot message and enables takeover for 5 minutes.

3) **Toggle human takeover**
- `POST /api/conversations/:id/takeover`
- Body: `{ enabled: boolean }`
- Behavior:
  - `enabled: true` → starts takeover (5 min TTL).
  - `enabled: false` → release takeover and auto-respond immediately if last message is from the user.

4) **Update topic**
- `POST /api/conversations/:id/topic`
- Body: `{ topic: string }`
- Topic must be in `TOPIC_LABELS` (includes “Resolved Issue”, “Needs Human”, and “Needs Immediate Attention”).
- Sets `topic_source = "manual"` and disables auto-topic updates.

5) **Update resolution status**
- `POST /api/conversations/:id/status`
- Body: `{ status: "resolved" | "unresolved" }`

6) **Exports (optional)**
- `GET /api/conversations/:id/export?format=json|csv`
- `GET /api/conversations/export?format=json|csv`
- `POST /api/conversations/export-selected` with `{ conversationIds: string[] }`

7) **LINE-only send**
- `POST /api/integrations/line/send`
- Body: `{ conversation_id: string, message: string }`
- Only valid for conversations with `source = "line"`.

### B) Conversations (public API key)

1) **Get messages**
- `GET /api/v1/conversations/:id/messages?limit=200&since=<iso>`
- Header: `Authorization: Bearer <API_KEY>`
- Returns: `{ messages: [{ id, sender, content, created_at }] }`

2) **Stream messages (SSE)**
- `GET /api/v1/conversations/:id/stream?api_key=<API_KEY>`
- Emits events with `message: { id, sender, content, created_at }`
- Use for realtime updates (fallback to polling).

## 4) Realtime Strategy

**Internal app (recommended):**
- Subscribe via Supabase Realtime to:
  - `bot_messages` where `conversation_id = <id>`
  - `bot_conversations` where `id = <id>` for takeover status changes

**External app:**
- Use SSE (`/api/v1/conversations/:id/stream`)
- Fallback: poll `GET /api/v1/conversations/:id/messages?since=...` every 2–5s

## 5) Data Flow (Conversation View)

1) Load conversation metadata and messages.
2) Start realtime subscription (or SSE).
3) Render messages.
4) If human takes over:
   - Call `/api/conversations/:id/takeover` with `{ enabled: true }`
   - Bot responses are suppressed while takeover is active.
5) If human releases:
   - Call `/api/conversations/:id/takeover` with `{ enabled: false }`
   - If a user message is pending, bot responds immediately.

## 6) Background Worker (Takeover Expirations)

We now handle takeover timeouts with a background worker:

- **Endpoint:** `POST /api/conversations/takeover/process`
- **Header:** `x-takeover-worker-secret: <TAKEOVER_WORKER_SECRET>`
- **Cron:** every 1–2 minutes

This worker:
- Finds expired takeovers (non-LINE)
- Clears takeover state
- If the last message is from the user, triggers an AI response

## 7) Pre-configured Responses: Human Handoff

We support human handoff through canned response actions. These run before the LLM and can trigger takeover side effects.

**Actions (bot_canned_responses.action):**
- `human_request` → responds with a confirmation prompt, sets topic to **Needs Human**, and (LINE only) includes quick reply buttons.
- `human_takeover_on` → immediately silences the bot by setting `human_takeover = true` and `human_takeover_until` (duration from `action_config.takeover_hours`, default 15).
- `human_takeover_off` → releases takeover (`human_takeover = false`, `human_takeover_until = null`).

**Recommended default patterns:**
- Request: `human|talk to (a )?human|human agent|customer service rep|customer service representative|speak to (a )?human`
- Confirm: `human` (exact, higher priority)
- Release: `bot` (exact)

**Channel behavior:**
- LINE: `human_request` responses include quick reply buttons (“Human”, “Bot”).
- Web/API: text-only confirmation prompt.

**Defaults:**
- Newly created bots seed these canned responses automatically.
- Existing bots can be backfilled via migration (`supabase/migrations/20260115000002_backfill_human_handoff_canned_responses.sql`).

## 8) Known Gaps

There is **no public “list conversations”** endpoint yet. For a dedicated conversations app, you’ll likely want:
- `GET /api/conversations` (session auth) or
- `GET /api/v1/conversations` (API key)

If you want, I can implement a list endpoint next.

## 9) UI Features to Include

- Conversation list (by bot, status, topic, last activity)
- Conversation view with:
  - Messages
  - Takeover toggle + TTL status
  - Status toggle (resolved/unresolved)
  - Topic dropdown (manual)
  - Export actions
- Live updates (realtime)

---

If you want, tell me which option you’re building (internal vs external) and I can tailor the endpoints and UI flows. 

## 10) Recommended Extraction Plan (Internal App)

This assumes you duplicate the existing codebase and trim it down to a focused conversations app.

**Step 1: Copy and rebrand**
- Duplicate the repo and update app name, icons, and basic metadata.
- Keep the current auth/session setup and Supabase client wiring.

**Step 2: Strip non-conversations features**
- Remove unrelated routes, pages, components, and feature flags.
- Keep shared layout, navigation, and auth guards if they’re stable.

**Step 3: Wire the core screens**
- Conversation list (with filters and last activity).
- Conversation detail view (messages, takeover, status, topic, export).

**Step 4: Realtime + state**
- Subscribe to `bot_messages` and `bot_conversations`.
- Ensure takeover state and new messages update instantly.

**Step 5: Fill known gap**
- Implement `GET /api/conversations` (session auth) if you need listing.
- Add minimal pagination and filters (status, topic, bot, date).

**Step 6: Cleanup pass**
- Remove unused environment variables and feature toggles.
- Delete dead components and update tests/fixtures accordingly.

**Step 7: QA + rollout**
- Verify auth + permissions.
- Exercise takeover flows and export endpoints.
- Ship behind internal access controls.

## 11) Repo-Specific Keep/Remove Map (Current Codebase)

Use this as a starting point for what to keep vs remove when extracting.

**Keep (core conversations)**
- `src/app/(app)/dashboard/conversations` (list UI + filters)
- `src/app/(app)/chat/[slug]/page.tsx` (detail view via `conversationId`)
- `src/components/chat/conversation-viewer.tsx` (message view + actions)
- `src/app/actions/conversations/*` and `src/app/actions/chat/delete-conversation.ts`
- `src/app/api/conversations/*` and `src/app/api/conversations/takeover/process`
- `src/lib/conversations/*`
- Supabase auth/session helpers: `src/utils/supabase/*`
- Auth pages: `src/app/(app)/(auth-pages)/*`, `src/app/(app)/auth/callback`
- Minimal dashboard shell: `src/app/(app)/dashboard/layout.tsx`, `src/components/dashboard/app-sidebar.tsx`, `src/components/dashboard/user-nav.tsx`

**Optional (only if needed)**
- `src/app/api/integrations/line/send` + `src/lib/integrations/line/*` (LINE-only send)
- `src/app/api/v1/conversations/*` (public API key endpoints)

**Remove or defer (non-conversations product surface)**
- Marketing site: `src/app/(site)/*`
- Bots: `src/app/(app)/dashboard/bots/*`, `src/components/bots/*`
- Documents/RAG: `src/app/(app)/dashboard/documents/*`, `src/components/documents/*`, `src/lib/documents/*`
- Analytics: `src/app/(app)/dashboard/analytics/*`, `src/app/actions/analytics/*`, `src/lib/analytics/*`
- Billing/Team/Admin/Settings/API Keys: `src/app/(app)/dashboard/{billing,team,admin,settings,api-keys}/*`
- Public chat widget: `src/components/chat/floating-chat-widget.tsx`

**Notes**
- The conversations list links to `/chat/[slug]?conversationId=...` today. If you want a cleaner detail route, add `/dashboard/conversations/[id]` and move `ConversationViewer` there.
- If you remove bots UI, keep the bot lookup in `get-conversations` (bot name/slug) since it powers the list and detail view.

## 12) Mobile-First PWA Direction (Design + UX)

This app is intended as a dedicated, mobile-first PWA for managing conversations. Prioritize clarity and speed over dashboard complexity.

**Layout**
- Full-screen, edge-to-edge layout. Avoid persistent sidebars on mobile.
- Single primary nav: bottom tab bar or top segmented control (List / Search / Settings).
- Large tap targets and minimal chrome.

**Conversation list**
- Cards or rows with: bot name (optional), user label, last message preview, time, status badge.
- Swipe actions (resolve/unresolve, takeover toggle) if supported.
- Keep filters as a compact sheet or modal.

**Conversation detail**
- Full-height message view with sticky composer and takeover controls.
- One primary action row: Takeover toggle + status + topic.
- Collapse secondary actions (export, delete) into a menu.

**PWA**
- Add a standalone shell with fast initial load (skeletons or cached list).
- Enable offline-safe view (read-only cached conversations if desired).
- Use `display: standalone`, disable overscroll bounce on iOS if needed.

**Visual system**
- Simple, high-contrast typography for quick scanning.
- Avoid dense tables; prefer cards and chips.
- Favor one accent color for statuses + minimal icons.

## 13) Mobile-First Extraction Plan (Fastest Dev Path)

This trims scope to only the mobile PWA shell, conversation list, and detail view.

**Phase 1: PWA shell + auth**
- Keep sign-in flow and session handling.
- Replace the dashboard sidebar with a full-screen layout and a simple top bar.

**Phase 2: Conversation list**
- Keep `get-conversations` and the list UI only.
- Move filters into a compact bottom sheet or modal.

**Phase 3: Conversation detail**
- Use `ConversationViewer` for the message view.
- Keep takeover/status/topic controls in a sticky action row.

**Phase 4: Minimal settings**
- Only include user profile + sign out.
- Defer admin/team/billing/analytics.

**Phase 5: Iteration**
- Add exports and bulk actions after the core flow feels solid.
- Add tablet/desktop layout as a progressive enhancement.

## 14) Compact Mobile Layout Spec (MVP)

**Viewport + spacing**
- Base spacing scale: 4, 8, 12, 16, 20, 24.
- Page padding: 12px (mobile), 16px (large phones).
- Sticky bars: 48–56px height.

**Typography**
- Title: 18–20px semibold.
- Body: 14–15px regular.
- Meta: 12px regular, muted.

**List row (conversation item)**
- Left: avatar or source icon.
- Center: user label + message preview (2 lines max).
- Right: time + status chip.

**Detail view**
- Header: back, title, quick status chip.
- Message list: full height, compact bubbles.
- Action bar: Takeover toggle, status, topic dropdown.

**Navigation**
- Prefer a top bar and a single primary screen (list → detail).
- Use modal sheet for filters and secondary actions.

## 15) File-Level Keep/Remove/Rename Checklist

**Keep (mobile MVP)**
- `src/app/(app)/dashboard/conversations/*`
- `src/app/(app)/chat/[slug]/page.tsx` (detail view via `conversationId`)
- `src/components/chat/conversation-viewer.tsx`
- `src/app/actions/conversations/*`
- `src/app/actions/chat/delete-conversation.ts`
- `src/app/api/conversations/*`
- `src/lib/conversations/*`
- `src/utils/supabase/*`
- `src/app/(app)/(auth-pages)/*`
- `src/app/(app)/auth/callback`
- `src/app/(app)/dashboard/layout.tsx` (replace with mobile shell)
- `src/components/dashboard/user-nav.tsx` (or a simpler header)

**Remove (initial trim)**
- `src/app/(site)/*`
- `src/app/(app)/dashboard/{bots,documents,analytics,billing,team,admin,settings,api-keys}/*`
- `src/components/{bots,documents,billing,home,marketing}` (if unused after trim)
- `src/lib/{analytics,documents}` (if no longer referenced)
- `src/components/chat/floating-chat-widget.tsx`

**Rename / Restructure (recommended)**
- Replace `/dashboard/conversations` with `/conversations` for mobile UX.
- Replace `/chat/[slug]` detail with `/conversations/[id]` and route directly.
- Move shared UI to `src/components/conversations/*`.

**Safe-to-delay**
- `src/app/api/v1/*` (public API)
- `src/app/api/integrations/line/*` (LINE-only support)

## 16) Minimal PWA Layout Files (Routes + Components)

**Routes**
- `src/app/(app)/conversations/page.tsx` (list)
- `src/app/(app)/conversations/[id]/page.tsx` (detail)
- `src/app/(app)/layout.tsx` (mobile shell)

**Components**
- `src/components/conversations/list.tsx`
- `src/components/conversations/list-item.tsx`
- `src/components/conversations/detail.tsx`
- `src/components/conversations/top-bar.tsx`
- `src/components/conversations/filters-sheet.tsx`

**Layout behavior**
- Full-screen mobile shell with top bar and optional bottom actions.
- No sidebar; hide desktop nav entirely on small screens.
