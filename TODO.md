# TODO — ChatIQ SaaS (Next.js 16, Supabase, Stripe, OpenAI)

> Single goal: Ship a production-ready MVP with embed widget + API + Stripe in 30 days (5h/day).

todo...

---

## TODAY (Nov 4, 2025)

- [ ] Create Supabase migration scripts for the core tables (`bot_teams`, `bot_team_members`, `bot_bots`, `bot_documents`, `bot_conversations`, `bot_doc_chunks`, `bot_embeddings`, `bot_audit_log`)
- [ ] Enable the `pgvector` extension within the migration bundle and add helper indexes where needed
- [ ] Capture migration order + rollback notes in `docs/technical-architecture.md` (appendix section)

---

## COMPLETED (Nov 3, 2025)

- [x] Confirm envs exist and load correctly (`lib/env.ts`): - `OPENAI_API_KEY` - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - `SUPABASE_SERVICE_ROLE_KEY` (server only) - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - `NEXT_PUBLIC_APP_URL` (e.g., https://yourdomain.com)
- [x] Install deps: Next.js 16, Tailwind, ShadCN, Supabase, Stripe
- [x] Create base folders: `app/`, `app/api/`, `components/`, `lib/`, `.cursor/` (globals stay in `src/app/globals.css`)
- [x] Add `.cursor/context.md` and `.cursor/instructions.md` (done)
- [x] Write “Three Priorities” for the week in this file (see below)

---

## WEEK 1 — CORE (Auth, Bots, Message API, Widget Shell)

**Outcome:** user can sign up, create a bot, send/receive messages via `/api/message`, and see a basic embedded widget.

### App structure

- [ ] `app/(marketing)/page.tsx` — basic landing
- [ ] `app/(dashboard)/dashboard/page.tsx` — list bots
- [ ] `app/(dashboard)/dashboard/bots/[id]/page.tsx` — edit bot
- [ ] `app/chat/[slug]/page.tsx` — hosted chat page (used by iframe)
- [ ] `app/widget/route.tsx|page.tsx` — minimal HTML widget UI
- [ ] `public/embed.js` (or `app/embed/route.ts`) — loader script

### Database (Supabase)

- [ ] SQL: `bots`, `messages`, `subscriptions` tables with indexes
- [ ] RLS policies: owners only on `bots/messages`
- [ ] Seed query for a demo bot

### Lib

- [ ] `lib/env.ts` — runtime env validation
- [ ] `lib/supabase.ts` — server/client helpers
- [ ] `lib/auth.ts` — session helper
- [ ] `lib/rate-limit.ts` — per-bot+IP limiter
- [ ] `lib/ai.ts` — OpenAI server client
- [ ] `lib/stripe.ts` — Stripe client + helpers

### API

- [ ] `app/api/bot/route.ts` — create/update (Zod validate, AuthZ)
- [ ] `app/api/bots/route.ts` — list (AuthZ)
- [ ] `app/api/message/route.ts` — POST (stream reply; rate-limit; store logs)

### Widget (shell)

- [ ] `public/embed.js`: inject fixed iframe → `/widget?bot=...&theme=...`
- [ ] `app/widget` page: minimal chat UI (input, scrollback, stream)
- [ ] `postMessage` bridge: `open/close/identify/send` + origin checks

**Ship at end of Week 1:**

- Sign-up → create bot → chat works (hosted + widget).

---

## WEEK 2 — POLISH CORE + STRIPE + LIMITS

**Outcome:** paywall live, tiers enforced, UX decent.

### Billing

- [ ] Stripe products/prices: Free, Starter ($9), Pro ($29), Agency ($99)
- [ ] Checkout link or Billing Portal integration
- [ ] Webhook route `app/api/stripe/webhook/route.ts` → upsert `subscriptions`
- [ ] Middleware: plan gating (enforce message quotas per tier)

### Limits & Moderation

- [ ] Free plan daily message cap (e.g., 25/day)
- [ ] Abuse guard: length caps, moderation call before OpenAI
- [ ] CORS on `/api/message`: allow widget + approved origins only
- [ ] Embed JWT: `/api/embed` to mint `{botId, origin, exp}`; verify in widget

### UX/Docs

- [ ] Onboarding wizard: create first bot on signup
- [ ] Empty states, toasts, loading states, errors
- [ ] Docs page: embed instructions + API example

**Ship at end of Week 2:**

- Payments live; free vs paid limits enforced; embed instructions published.

---

## WEEK 3 — WIDGET UX + ANALYTICS + CONTENT

**Outcome:** widget feels good, simple analytics, public marketing.

### Widget UX

- [ ] Floating bubble + open/close animation
- [ ] Theme options: `light`/`dark`/`auto`; brand color param
- [ ] Mobile: full-height sheet mode
- [ ] Accessibility: focus trap, keyboard send, ARIA labels

### Analytics (MVP)

- [ ] `bot_logs` or reuse `messages`: track tokens, response time
- [ ] Dashboard stats: messages/day, users, top bots
- [ ] Basic export (CSV) or copy-to-clipboard

### Marketing

- [ ] Landing v1 (benefits, features, pricing)
- [ ] “How to add to Next.js / WordPress / Webflow” guides
- [ ] Record 1 demo video (GIF acceptable)

**Ship at end of Week 3:**

- Polished widget + basic analytics + proper landing/docs.

---

## WEEK 4 — HARDENING + BETA + SOFT LAUNCH

**Outcome:** invite 10–20 testers, fix bugs, public soft launch.

### Hardening

- [ ] Rate-limit tuned; 429 behavior tested
- [ ] Timeouts/abort controllers for streaming
- [ ] Error envelope standardized `{error:{code,message}}`
- [ ] Logging: server errors with request ids, no secrets
- [ ] Privacy toggle: “Do not store conversations”

### Beta

- [ ] Invite 10–20 testers (agency, dev friends)
- [ ] Capture feedback; prioritize top 5 issues
- [ ] Add “Made with \_\_\_” badge link option

### Soft Launch

- [ ] Product Hunt draft
- [ ] Indie Hackers + X thread
- [ ] Simple changelog `/changelog`

**Ship at end of Week 4:**

- Real users using paid flow; feedback loop running.

---

## DAILY LOOP (5h)

1. **15m** — Set top 3 tasks here
2. **3h** — Implement (Cursor inline AI)
3. **45m** — Self review + small tests
4. **45m** — Codex architecture review, log decisions
5. **15m** — Changelog + TODO update

---

## SECURITY / QUALITY CHECKLIST (RUN WEEKLY)

- [ ] Input validation with Zod on all routes
- [ ] AuthZ: user owns `bot_id` in every op
- [ ] No client exposure of secrets
- [ ] CORS pinned to widget + allowed origins
- [ ] postMessage origin verified
- [ ] Rate-limit present and tested
- [ ] DB indexes exist; slow queries checked
- [ ] Streaming doesn’t leak stack traces
- [ ] 4xx/5xx responses are JSON, stable shape
- [ ] Env validation on boot (fail fast)

---

## COMMANDS / SCRIPTS (add to package.json)

- [ ] `dev`: `next dev`
- [ ] `build`: `next build && next lint`
- [ ] `start`: `next start`
- [ ] `typecheck`: `tsc --noEmit`
- [ ] `lint`: `next lint`
- [ ] `db:push`: (your Supabase migration script)
- [ ] `postinstall`: `shadcn-ui init` (if applicable)

---

## OPEN QUESTIONS (PARKING LOT)

- [ ] Final brand/name (current working: Team Chat Code)
- [ ] Message pricing vs token pricing; per-bot overage?
- [ ] WordPress plugin timeline (after MVP)
- [ ] Templates gallery scope (Week 3+)

---

## THIS WEEK’S THREE PRIORITIES

1. [ ] `/api/message` streaming + rate-limit + moderation
2. [ ] `embed.js` + `/widget` functional + origin checks
3. [ ] Stripe Starter plan + webhook → `subscriptions`
