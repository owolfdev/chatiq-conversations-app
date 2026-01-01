chatiq.io

# supabase

# account: chatcodeapp@gmail.com

# project: Team Chat Code

✅ Here's a full **project overview**, with clear technical structure and a development path that will take you from the current state to a scalable production app.

---

## 🧠 Project Overview: ChatIQ SaaS Platform

A hosted platform where users:

- Create and configure AI bots
- Upload custom documents as prompt context
- Embed bots into their own sites or use them via API
- View chat logs, usage, and manage plans

---

## 🏗️ Architecture Summary

### 👨‍💻 Frontend (Next.js 15 App Router)

| Feature          | Tech                                                  |
| ---------------- | ----------------------------------------------------- |
| Hosted bot pages | `app/chat/[slug]/page.tsx`                            |
| Dashboard        | Auth, bot creation, document upload                   |
| Chat UI          | `<Chat />` component with `useState` for local memory |
| Theming / UX     | Tailwind, Lucide, shadcn/ui                           |

---

### ⚙️ Backend (Next.js + Supabase)

| Component     | Details                                                       |
| ------------- | ------------------------------------------------------------- |
| Supabase Auth | Email login, user identity                                    |
| Database      | `bot_bots`, `bot_documents`, `bot_logs`, `bot_api_keys`, etc. |
| RLS (later)   | Secure user access to rows                                    |
| API route     | `POST /api/chat` — for embedded and hosted bots               |
| Rate Limiting | IP-based for guests, API key-based for API users              |

---

### 💬 Chat Flow

| User Type          | History Source                                    |
| ------------------ | ------------------------------------------------- |
| Guest on your site | `useState`, 10-turn history passed to API         |
| Logged-in users    | `useState` (→ later: persist with `bot_messages`) |
| API users          | `session_id` in body → retrieve history from DB   |

---

## 📁 Suggested Project Structure

```
/src
├── app/
│   ├── page.tsx                     # Landing with demo bot
│   ├── chat/[slug]/page.tsx        # Hosted bot experience
│   ├── api/chat/route.ts           # Universal chat API
│   └── dashboard/                  # User bot/document management
├── components/
│   ├── chat/                       # Chat UI (message bubble, etc.)
│   ├── header/                     # Navigation
├── lib/
│   ├── chat/handle-chat-requests.ts
│   ├── middleware/rate-limit.ts
│   ├── utils.ts
├── utils/
│   └── supabase/client.ts / server.ts
```

---

## 📶 Supabase Tables (with `bot_` prefix)

| Table                   | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `bot_bots`              | Stores each chatbot (system prompt, slug, public) |
| `bot_documents`         | Documents linked to each bot                      |
| `bot_api_keys`          | API keys tied to bots/users                       |
| `bot_user_profiles`     | User metadata (plan, name, etc.)                  |
| `bot_logs` (optional)   | Pair-based logs for analytics                     |
| `bot_messages` (future) | Full multi-turn history (per session_id)          |
| `bot_rate_limits`       | IP or API key-based usage control                 |

---

## 🛤️ Development Path

### ✅ Phase 1 (NOW)

- ✅ Working chatbot UI with prompt + system prompt
- ✅ Guest chat with 10-turn memory via state
- ✅ Fallback to `default-app-bot`
- ✅ API route to handle external use

---

### 🚧 Phase 2 (NEXT)

- [ ] Bot creation UI in dashboard
- [ ] Document upload + markdown storage
- [ ] `GET /api/docs` or inline retrieval in `handleChatRequest`
- [ ] Save API keys per bot
- [ ] Restrict `/api/chat` to API key (for external)
- [ ] Abuse detection and prevention using the Content Moderation API.

---

### 📦 Phase 3 (SCALING)

- [ ] Add `bot_messages` for full logging
- [ ] Use `session_id` for context in API
- [ ] Per-user rate limits via API key
- [ ] Upgrade plans (Free, Pro) via Stripe
- [ ] Public bot gallery (`/explore`)

---

### 🚀 Phase 4 (PRODUCTION)

- [ ] Add RLS to all `bot_` tables
- [ ] Deploy monitoring/logging (e.g. LogSnag, Sentry)
- [ ] Add usage analytics dashboard
- [ ] Caching + prompt optimization

---

Here’s a description you can drop directly into your project overview under a **"🔐 Safety & Abuse Prevention"** section:

---

## 🔐 Safety & Abuse Prevention

### 🧰 Content Moderation API (OpenAI)

To protect our platform and comply with OpenAI’s usage policies, we implement the [OpenAI Moderation API](https://platform.openai.com/docs/guides/moderation/overview) as a first line of defense against abusive or inappropriate user input.

The Moderation API automatically detects and flags content in categories such as:

- Sexual content
- Hate speech
- Violence or self-harm
- Harassment or threats
- Criminal activity

Before any prompt is sent to OpenAI’s `chat/completions` endpoint, it is first passed through the Moderation API. If a message is flagged, it is blocked and the user receives a warning or error message — ensuring that harmful prompts never reach the chat model.

### 🛡️ Our Implementation Intent

We anticipate potential abuse of the chat system by some users, and to proactively mitigate this risk, we have integrated moderation checks into all chat flows:

- ✅ Guest and logged-in prompts are screened before sending to OpenAI
- ✅ Flagged prompts are blocked with a user-facing error
- ✅ Offending categories (e.g., `sexual`, `violence`, `hate`) are optionally logged for review
- ✅ Future plans include abuse rate tracking and auto-throttling

This safeguards our company’s OpenAI account from policy violations and helps maintain a safe, compliant experience for all users.

## 🔐 Auth Access Matrix

| Route          | Access                    | Notes                      |
| -------------- | ------------------------- | -------------------------- |
| `/chat/[slug]` | Public                    | Loads by `bot_slug`        |
| `/dashboard`   | Supabase session          | Manages own bots           |
| `/api/chat`    | Public w/ API key         | For external embedded bots |
| API w/o key    | Guest with IP-based limit | Demo/freemium use          |

## Database Schema from Supabase

[
{
"table_name": "bot_api_keys",
"column_name": "id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": "gen_random_uuid()"
},
{
"table_name": "bot_api_keys",
"column_name": "user_id",
"data_type": "uuid",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_api_keys",
"column_name": "key",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_api_keys",
"column_name": "label",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_api_keys",
"column_name": "created_at",
"data_type": "timestamp without time zone",
"is_nullable": "YES",
"column_default": "now()"
},
{
"table_name": "bot_api_keys",
"column_name": "bot_id",
"data_type": "uuid",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_bots",
"column_name": "id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": "gen_random_uuid()"
},
{
"table_name": "bot_bots",
"column_name": "user_id",
"data_type": "uuid",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_bots",
"column_name": "name",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_bots",
"column_name": "description",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_bots",
"column_name": "system_prompt",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_bots",
"column_name": "slug",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_bots",
"column_name": "is_public",
"data_type": "boolean",
"is_nullable": "YES",
"column_default": "true"
},
{
"table_name": "bot_bots",
"column_name": "created_at",
"data_type": "timestamp without time zone",
"is_nullable": "YES",
"column_default": "now()"
},
{
"table_name": "bot_bots",
"column_name": "status",
"data_type": "text",
"is_nullable": "NO",
"column_default": "'active'::text"
},
{
"table_name": "bot_contact_messages",
"column_name": "id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": "gen_random_uuid()"
},
{
"table_name": "bot_contact_messages",
"column_name": "name",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_contact_messages",
"column_name": "email",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_contact_messages",
"column_name": "company",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_contact_messages",
"column_name": "subject",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_contact_messages",
"column_name": "message",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_contact_messages",
"column_name": "inquiry_type",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_contact_messages",
"column_name": "created_at",
"data_type": "timestamp with time zone",
"is_nullable": "YES",
"column_default": "now()"
},
{
"table_name": "bot_contact_messages",
"column_name": "status",
"data_type": "text",
"is_nullable": "YES",
"column_default": "'unread'::text"
},
{
"table_name": "bot_conversations",
"column_name": "id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": "gen_random_uuid()"
},
{
"table_name": "bot_conversations",
"column_name": "bot_id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_conversations",
"column_name": "user_id",
"data_type": "uuid",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_conversations",
"column_name": "title",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_conversations",
"column_name": "created_at",
"data_type": "timestamp without time zone",
"is_nullable": "YES",
"column_default": "now()"
},
{
"table_name": "bot_document_links",
"column_name": "bot_id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_document_links",
"column_name": "document_id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_documents",
"column_name": "id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": "gen_random_uuid()"
},
{
"table_name": "bot_documents",
"column_name": "bot_id",
"data_type": "uuid",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_documents",
"column_name": "title",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_documents",
"column_name": "content",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_documents",
"column_name": "tags",
"data_type": "ARRAY",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_documents",
"column_name": "created_at",
"data_type": "timestamp without time zone",
"is_nullable": "YES",
"column_default": "now()"
},
{
"table_name": "bot_documents",
"column_name": "user_id",
"data_type": "uuid",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_documents",
"column_name": "is_global",
"data_type": "boolean",
"is_nullable": "YES",
"column_default": "false"
},
{
"table_name": "bot_logs",
"column_name": "id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": "gen_random_uuid()"
},
{
"table_name": "bot_logs",
"column_name": "bot_id",
"data_type": "uuid",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_logs",
"column_name": "user_message",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_logs",
"column_name": "assistant_response",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_logs",
"column_name": "created_at",
"data_type": "timestamp without time zone",
"is_nullable": "YES",
"column_default": "now()"
},
{
"table_name": "bot_messages",
"column_name": "id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": "gen_random_uuid()"
},
{
"table_name": "bot_messages",
"column_name": "conversation_id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_messages",
"column_name": "sender",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_messages",
"column_name": "content",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_messages",
"column_name": "created_at",
"data_type": "timestamp without time zone",
"is_nullable": "YES",
"column_default": "now()"
},
{
"table_name": "bot_rate_limits",
"column_name": "id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": "gen_random_uuid()"
},
{
"table_name": "bot_rate_limits",
"column_name": "ip_address",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_rate_limits",
"column_name": "api_key",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_rate_limits",
"column_name": "date",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_rate_limits",
"column_name": "usage_count",
"data_type": "integer",
"is_nullable": "YES",
"column_default": "1"
},
{
"table_name": "bot_user_activity_logs",
"column_name": "id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": "gen_random_uuid()"
},
{
"table_name": "bot_user_activity_logs",
"column_name": "user_id",
"data_type": "uuid",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_user_activity_logs",
"column_name": "type",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_user_activity_logs",
"column_name": "metadata",
"data_type": "jsonb",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_user_activity_logs",
"column_name": "message",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_user_activity_logs",
"column_name": "created_at",
"data_type": "timestamp without time zone",
"is_nullable": "YES",
"column_default": "now()"
},
{
"table_name": "bot_user_profiles",
"column_name": "id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "bot_user_profiles",
"column_name": "username",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_user_profiles",
"column_name": "full_name",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_user_profiles",
"column_name": "avatar_url",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_user_profiles",
"column_name": "plan",
"data_type": "text",
"is_nullable": "YES",
"column_default": "'free'::text"
},
{
"table_name": "bot_user_profiles",
"column_name": "is_verified",
"data_type": "boolean",
"is_nullable": "YES",
"column_default": "false"
},
{
"table_name": "bot_user_profiles",
"column_name": "created_at",
"data_type": "timestamp without time zone",
"is_nullable": "YES",
"column_default": "now()"
},
{
"table_name": "bot_user_profiles",
"column_name": "bio",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_user_profiles",
"column_name": "location",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_user_profiles",
"column_name": "website",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_user_profiles",
"column_name": "email",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_user_profiles",
"column_name": "twitter_handle",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_user_profiles",
"column_name": "github_handle",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_user_profiles",
"column_name": "public_email",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "bot_user_profiles",
"column_name": "role",
"data_type": "text",
"is_nullable": "NO",
"column_default": "'user'::text"
},
{
"table_name": "chat_messages",
"column_name": "message_id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": "gen_random_uuid()"
},
{
"table_name": "chat_messages",
"column_name": "timestamp",
"data_type": "timestamp with time zone",
"is_nullable": "NO",
"column_default": "now()"
},
{
"table_name": "chat_messages",
"column_name": "chat_room_id",
"data_type": "uuid",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "chat_messages",
"column_name": "sender_id",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "chat_messages",
"column_name": "message_content",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "chat_messages",
"column_name": "language",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "chat_messages",
"column_name": "title",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "chat_participants",
"column_name": "participant_id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": "gen_random_uuid()"
},
{
"table_name": "chat_participants",
"column_name": "user_id",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "chat_participants",
"column_name": "chat_room_id",
"data_type": "uuid",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "chat_participants",
"column_name": "joined_at",
"data_type": "timestamp with time zone",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "chat_participants",
"column_name": "invitation_status",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "chat_participants",
"column_name": "user_email",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "chat_participants",
"column_name": "invited_by",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "chat_rooms",
"column_name": "chat_room_id",
"data_type": "uuid",
"is_nullable": "NO",
"column_default": "gen_random_uuid()"
},
{
"table_name": "chat_rooms",
"column_name": "created_at",
"data_type": "timestamp with time zone",
"is_nullable": "NO",
"column_default": "now()"
},
{
"table_name": "chat_rooms",
"column_name": "name",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "chat_rooms",
"column_name": "description",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "chat_rooms",
"column_name": "admin_id",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "feedback_submissions",
"column_name": "id",
"data_type": "bigint",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "feedback_submissions",
"column_name": "created_at",
"data_type": "timestamp with time zone",
"is_nullable": "NO",
"column_default": "now()"
},
{
"table_name": "feedback_submissions",
"column_name": "email",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "feedback_submissions",
"column_name": "name",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "feedback_submissions",
"column_name": "message",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "feedback_submissions",
"column_name": "type",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "profiles",
"column_name": "id",
"data_type": "text",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "profiles",
"column_name": "subscription",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "test_table",
"column_name": "id",
"data_type": "bigint",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "test_table",
"column_name": "created_at",
"data_type": "timestamp with time zone",
"is_nullable": "NO",
"column_default": "now()"
},
{
"table_name": "test_table",
"column_name": "data",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "test_table",
"column_name": "user",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "update",
"column_name": "id",
"data_type": "bigint",
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "update",
"column_name": "created_at",
"data_type": "timestamp with time zone",
"is_nullable": "NO",
"column_default": "now()"
},
{
"table_name": "update",
"column_name": "date",
"data_type": "text",
"is_nullable": "YES",
"column_default": null
}
]

### Next.js 15 app router project tree:

tree /Users/wolf/Documents/Development/Projects/ChatBot/chat-bot-saas/src
/Users/wolf/Documents/Development/Projects/ChatBot/chat-bot-saas/src
├── app
│   ├── (auth-pages)
│   │   ├── forgot-password
│   │   │   └── page.tsx
│   │   ├── sign-in
│   │   │   └── page.tsx
│   │   ├── sign-up
│   │   │   └── page.tsx
│   │   └── smtp-message.tsx
│   ├── actions
│   │   ├── activity
│   │   │   ├── get-user-activity-logs-client.ts
│   │   │   ├── get-user-activity-logs.ts
│   │   │   └── log-user-activity.ts
│   │   ├── admin
│   │   │   └── get-admin-stats.ts
│   │   ├── auth
│   │   │   ├── auth-actions.ts
│   │   │   ├── get-user-with-profile.ts
│   │   │   ├── get-user.ts
│   │   │   ├── logout.ts
│   │   │   └── update-user-profile.ts
│   │   ├── bots
│   │   │   ├── create-bot.ts
│   │   │   ├── delete-bot.ts
│   │   │   ├── get-bot-by-slug.ts
│   │   │   ├── get-conversation-counts.ts
│   │   │   ├── get-user-bots-with-counts.ts
│   │   │   └── update-bot.ts
│   │   ├── contact
│   │   │   ├── get-unread-contact-messages.ts
│   │   │   ├── mark-contact-message-read.ts
│   │   │   └── submit-contact-message.ts
│   │   └── profile
│   │   └── get-user-stats.ts
│   ├── api
│   │   └── chat
│   │   └── route.ts
│   ├── auth
│   │   └── callback
│   │   └── route.ts
│   ├── chat
│   │   └── [slug]
│   │   └── page.tsx
│   ├── contact
│   │   └── page.tsx
│   ├── dashboard
│   │   ├── admin
│   │   │   └── page.tsx
│   │   ├── analytics
│   │   │   └── page.tsx
│   │   ├── api-keys
│   │   │   └── page.tsx
│   │   ├── billing
│   │   │   └── page.tsx
│   │   ├── bots
│   │   │   ├── bots-gallery.tsx
│   │   │   ├── edit
│   │   │   │   └── [slug]
│   │   │   │   ├── edit-bot-form.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── new
│   │   │   │   ├── new-bot-form.tsx
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── documents
│   │   │   ├── [id]
│   │   │   │   └── page.tsx
│   │   │   ├── edit
│   │   │   │   └── [id]
│   │   │   │   └── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── new
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── settings
│   │   │   └── page.tsx
│   │   └── team
│   │   └── page.tsx
│   ├── docs
│   │   ├── [...slug]
│   │   │   └── page.tsx
│   │   ├── docs-page-client.tsx
│   │   ├── loading.tsx
│   │   └── page.tsx
│   ├── favicon.ico
│   ├── gallery
│   │   ├── loading.tsx
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── not-authorized
│   │   └── page.tsx
│   ├── not-found.tsx
│   ├── page.tsx
│   ├── profile
│   │   ├── \_archive
│   │   │   └── profile-tabs.tsx
│   │   └── page.tsx
│   ├── protected
│   │   └── reset-password
│   │   └── page.tsx
│   └── test
│   └── page.tsx
├── components
│   ├── \_archive
│   │   └── env-var-warning.tsx
│   ├── auth
│   │   └── auth-link.tsx
│   ├── chat
│   │   ├── chat-wrapper.tsx
│   │   ├── chat.tsx
│   │   ├── floating-chat-widget.tsx
│   │   ├── message-bubble.tsx
│   │   ├── typing-indicator.tsx
│   │   └── use-chat.tsx
│   ├── control
│   │   ├── submit-button.tsx
│   │   └── theme-switcher.tsx
│   ├── custom-fields
│   │   └── multi-select.tsx
│   ├── dashboard
│   │   ├── app-sidebar.tsx
│   │   ├── dashboard-header.tsx
│   │   ├── unread-messages.tsx
│   │   └── user-nav.tsx
│   ├── forms
│   │   └── document-form.tsx
│   ├── message
│   │   ├── env-var-warning.tsx
│   │   └── form-message.tsx
│   ├── nav
│   │   ├── app-header.tsx
│   │   ├── components
│   │   │   ├── main-nav.tsx
│   │   │   └── user-menu.tsx
│   │   ├── constants
│   │   │   └── nav-links.ts
│   │   ├── footer.tsx
│   │   └── mode-toggle.tsx
│   ├── profile
│   │   ├── PaginatedActivityFeed.tsx
│   │   └── edit-profile-dialog.tsx
│   ├── theme-provider.tsx
│   ├── title
│   │   └── animated-title.tsx
│   └── ui
│   ├── alert-dialog.tsx
│   ├── alert.tsx
│   ├── avatar.tsx
│   ├── badge.tsx
│   ├── breadcrumb.tsx
│   ├── button.tsx
│   ├── card.tsx
│   ├── checkbox.tsx
│   ├── command.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── popover.tsx
│   ├── select.tsx
│   ├── separator.tsx
│   ├── sheet.tsx
│   ├── sidebar.tsx
│   ├── skeleton.tsx
│   ├── sonner.tsx
│   ├── switch.tsx
│   ├── tabs.tsx
│   ├── textarea.tsx
│   └── tooltip.tsx
├── hooks
│   └── use-mobile.ts
├── lib
│   ├── chat
│   │   ├── fetch-documents.ts
│   │   ├── handle-chat-requests.ts
│   │   └── save-chat.ts
│   ├── middleware
│   │   └── rate-limit.ts
│   ├── utils
│   │   └── get-display-name.ts
│   └── utils.ts
├── middleware.ts
├── types
│   ├── bot.ts
│   ├── forms.ts
│   ├── profile.ts
│   └── template.ts
└── utils
├── extract-keywords.ts
├── supabase
│   ├── check-env-vars.ts
│   ├── client.ts
│   ├── middleware.ts
│   ├── role.ts
│   └── server.ts
└── utils.ts

67 directories, 135 files
