# Project Context — Chatbot SaaS (Next.js 16)

## Objective

Ship a production-ready SaaS that lets users:

1. Create and manage AI chatbots via dashboard.
2. Embed those bots anywhere using a one-line <script> widget.
3. Access chat via a secure REST API.
4. Subscribe to paid tiers through Stripe.

## Tech Stack

- Framework: Next.js 16 (App Router, React 19, Server Actions)
- Language: TypeScript (strict)
- UI: Tailwind CSS + ShadCN/UI
- DB/Auth: Supabase (Postgres + RLS + Auth)
- AI: OpenAI Chat Completions (server-side streaming)
- Billing: Stripe Checkout + Webhooks
- Hosting: Vercel (frontend) + Supabase (database/storage)

## Architecture Overview

app/
(marketing)/
(dashboard)/
api/
chat/[slug]/
widget/
embed/ → serves embed.js
components/
lib/
env.ts
supabase.ts
auth.ts
rate-limit.ts
ai.ts
stripe.ts
public/
assets/

### Core Routes

| Path                 | Purpose                    |
| -------------------- | -------------------------- |
| /api/message         | Streams chat replies       |
| /api/bot             | Create / update bot        |
| /api/bots            | List user bots             |
| /api/embed           | Mint signed embed token    |
| /api/register-domain | Plugin domain registration |
| /api/stripe/webhook  | Handle billing events      |

## Supabase Schema (draft)

bots (id uuid pk, user_id uuid fk, name text, slug text unique, model text, temperature float, system_prompt text, public boolean, created_at timestamptz)
messages (id uuid pk, bot_id uuid fk, user_hash text, role text, content text, created_at timestamptz)
documents (id uuid pk, bot_id uuid fk, title text, url text, content text, embedding_vector vector)
subscriptions (id uuid pk, user_id uuid fk, stripe_customer_id text, plan text, active boolean, created_at timestamptz)

## Embed System

- Universal script:
  <script src="https://yourdomain.com/embed.js" data-bot="BOT_ID" data-theme="auto" data-position="bottom-right"></script>
- embed.js injects a sandboxed iframe → /widget?bot=...
- postMessage bridge:
  host → widget: open, close, identify, send
  widget → host: opened, closed, message, conversion
- Validate event.origin; verify short-lived JWT for {botId, origin, exp}.

## Security & Performance

- All OpenAI calls server-side via Route Handlers or Server Actions.
- Strict CORS for /api/message and /widget.
- Zod validation for all inputs.
- RLS on Supabase tables; users see only their data.
- Rate-limit per bot + IP (lib/rate-limit.ts).
- Use Next.js 16 streaming and React 19 Suspense for chat updates.
- Edge caching disabled for dynamic APIs (cache: 'no-store').

## Conventions

- Server Components by default; only mark "use client" when interaction required.
- Co-locate styles with components; use Tailwind variables for themes.
- Type-safe envs (lib/env.ts) with runtime validation.
- Use Server Actions for bot CRUD where appropriate.
- Prefer async/await and explicit return types.
- One feature per commit; descriptive commit messages.

## Roadmap (Phase 1)

1. /api/message streaming + rate-limit + moderation
2. /widget UI + embed.js injection
3. Stripe Starter Plan + Webhook → subscriptions
4. Landing + Docs page → Soft launch

Current working name: Team Chat Code (final branding TBD).
