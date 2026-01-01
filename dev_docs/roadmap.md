# 🧭 **Team Chat Code — Developer Handoff 2025**

**Mission:**
Launch a secure, income-producing, multi-tenant chatbot SaaS within 90 days.
Our north star: **help any team build private, intelligent AI assistants** using their own documents — securely, simply, and profitably.

---

## 🧩 **Core Stack**

| Layer          | Technology                                                  |
| -------------- | ----------------------------------------------------------- |
| **Frontend**   | Next.js 15 (App Router) + ShadCN UI + Tailwind + TypeScript |
| **Backend**    | Supabase (Postgres + Auth + Storage + pgvector + RLS)       |
| **AI**         | OpenAI API (`gpt-4o-mini` + `text-embedding-3-small`)       |
| **Payments**   | Stripe Billing (usage & tier plans)                         |
| **Hosting**    | Vercel (front/API) + Supabase (DB/storage)                  |
| **Monitoring** | Vercel Analytics + Supabase Logs + Sentry                   |
| **Security**   | TLS, AES-256, RLS, Moderation API, audit logs               |

---

## 🧱 **Architecture Overview**

### **Frontend**

- `app/dashboard` — main UI for bots, documents, analytics
- `app/chat/[botSlug]` — hosted public chat page
- `/widget` — embedded widget frame
- `/embed.js` — loader script for websites
- `components/chat/` — shared chat logic (`useChat`, streaming, history)

### **Backend / Database**

**Key tables (simplified)**

```sql
teams(id, owner_id, name, plan)
bots(id, team_id, name, slug, model, temperature, system_prompt, visibility)
bot_collections(id, team_id, name, visibility)
bot_collection_links(bot_id, collection_id)
documents(id, team_id, collection_id, title, canonical_url, version, is_flagged)
doc_chunks(id, team_id, document_id, idx, text, anchor_id, hash)
embeddings(chunk_id, team_id, collection_id, vector)
bot_conversations(id, bot_id, team_id, user_hash, created_at)
bot_messages(id, conversation_id, role, content, created_at)
subscriptions(id, team_id, stripe_customer_id, plan, active)
audit_log(id, team_id, user_id, action, created_at)
```

---

## 🔒 **Security & Compliance Highlights**

- **Full RLS isolation** by `team_id`.
- **Encrypted storage** for files and tokens.
- **OpenAI Moderation API** scan on every upload + user message.
- **Content filter** for PII & illegal data (regex + heuristics).
- **Audit logs** for all CRUD operations.
- **Chat logs** stored 90 days (deletable/exportable).
- **Transparent privacy policy:** “Chats are private, never used for training.”

---

## 🧠 **RAG (Retrieval-Augmented Generation) System**

### Ingestion Pipeline

1. Upload or supply base URL (`/docs` or sitemap).
2. Crawler fetches and extracts text → normalized & cleaned.
3. Split into chunks (~600 tokens + 10 % overlap).
4. Each chunk inherits `canonical_url`, `anchor_id`, `collection_id`, `team_id`.
5. Embed with `text-embedding-3-small`.
6. Store in `embeddings` table (pgvector).

### Retrieval

- Query → embed → vector search

  ```sql
  SELECT ... FROM embeddings
  WHERE team_id=$team AND collection_id=ANY($bot_collections)
  ORDER BY embedding <-> $query LIMIT 8;
  ```

- Retrieved chunk text injected into model prompt with source citations.
- Supports both **internal SOP bots** and **public FAQ bots**.

---

## 💬 **Chat Experience**

- Streaming responses with abort + retry.
- Optimistic UI via `useChat` hook.
- Conversation history (90 days, deletable).
- “Private mode” toggle (no logging).
- “Read more” links from chunk metadata (`canonical_url#anchor_id`).

---

## 💵 **Monetization**

| Plan           | Price    | Includes                              |
| -------------- | -------- | ------------------------------------- |
| **Free**       | $0       | 1 bot, 3 docs, 50 messages/day        |
| **Pro**        | $29 / mo | 5 bots, 100 docs, 5 000 messages      |
| **Team**       | $79 / mo | 20 bots, 1 000 docs, priority support |
| **Enterprise** | Custom   | SSO, BYOK, dedicated region           |

Billing model: **per-team Stripe subscription**; usage metered by embeddings + chat requests.

---

## 📅 **90-Day Execution Roadmap**

### **Phase 1 — Foundation (Weeks 1-3)**

**Goal:** Stable base + MVP RAG

- ✅ Supabase schema + RLS
- ✅ Secure auth + teams + bot CRUD
- ✅ Moderation & content-filter middleware
- ✅ Document upload → parse → chunk → embed
- ✅ Vector search working in chat pipeline
- ✅ Stripe checkout (basic plan)
- 🔧 Internal alpha tests

**Deliverable:** first working end-to-end chat with semantic retrieval.

---

### **Phase 2 — Beta Launch (Weeks 4-6)**

**Goal:** Real users + payments

- ✅ Polished dashboard (UI/UX)
- ✅ Chat streaming + abort handling
- ✅ Chat history + deletion + export
- ✅ Invite & onboarding flow
- ✅ Stripe subscription tiers live
- ✅ Public demo bot on landing page
- 🚀 Start recruiting 10 paying pilot teams manually

**Deliverable:** Private Beta + first revenue.

---

### **Phase 3 — Public Launch (Weeks 7-9)**

**Goal:** Market traction & scale

- ✅ “Import from URL” crawler
- ✅ Analytics dashboard (usage, top bots)
- ✅ WordPress plugin (shortcode + domain registration)
- ✅ Legal docs: Terms, Privacy, Security, Moderation
- ✅ Soft launch on Product Hunt / Indie Hackers
- ✅ Add marketing site + live demo widget
- 📈 Reach ≥ 10 paying customers ($500–$1 000 MRR)

---

### **Phase 4 — Hardening (Weeks 10-12)**

**Goal:** Production stability & compliance prep

- ✅ Advanced RLS audit + penetration review
- ✅ Chat retention policy enforcement
- ✅ Automated backup + restore drills
- ✅ Usage alerts + rate limits
- ✅ Logging + Sentry error tracking
- ✅ Begin SOC 2 prep checklist

**Deliverable:** production-ready, revenue-generating SaaS with clear security story.

---

## 🔌 **Plugin & SDK Roadmap**

| Platform                      | Purpose                          | Status  |
| ----------------------------- | -------------------------------- | ------- |
| **WordPress**                 | Easy embed + domain registration | Phase 3 |
| **Shopify**                   | Chat widget via ScriptTag        | Phase 4 |
| **React SDK**                 | `@teamchatcode/react` component  | Phase 4 |
| **Webflow / Framer snippets** | No-code marketing embed          | Phase 4 |

---

## 🧱 **Post-Launch (Q3 2025+)**

- Google Drive / Notion connectors
- BYOK encryption keys
- SOC 2 Type II certification
- AI-powered analytics (topic clustering, FAQ discovery)
- Marketplace for public bots/templates

---

## 🏁 **Success Metrics**

| Metric                    | Target (90 days) |
| ------------------------- | ---------------- |
| Paying Teams              | ≥ 10             |
| Monthly Recurring Revenue | ≥ $1 000         |
| Docs Embedded             | ≥ 1 000          |
| Avg Chat Latency          | < 3 s            |
| Uptime                    | > 99.5 %         |
| Security Incidents        | 0                |

---

### **Tagline for internal use**

> “In 90 days we ship a secure, document-aware AI chatbot platform that any team can trust with their knowledge — and we get paid for it.”
