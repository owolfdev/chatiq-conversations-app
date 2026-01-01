## Todo: Green Mode chunk search + plan gating (Green + Free-after-trial)

We want to add a deterministic, non-AI way for ChatIQ bots to answer questions using uploaded documents. This means documents are chunked and indexed so the bot can search them using keywords or full-text search and return short, readable excerpts directly in chat, with an optional “read more” flow for longer sections. In this mode, responses do not pass through an LLM and no AI text is generated. This capability should be optional and controlled by the user’s plan: Free users get it after their trial ends, Green users get expanded access to it, and Pro/Team users can use it alongside AI answers. Chunking should always be available, while embedding and AI generation must be cleanly switchable on or off at the plan level. Once this capability exists, we introduce a new Green plan and update Free and Green limits across the app and pricing pages so users clearly understand what works with and without AI.

If you want it slightly more product-focused or slightly more technical, I can tune the tone either way.

### A) Define plan capabilities and limits (source of truth)

- Create a `PlanCapabilities` object (and DB representation) with explicit flags + limits:

  - `allow_llm_generation` (bool)
  - `allow_embeddings` (bool)
  - `retrieval_mode` = `"fts_only" | "fts_plus_embeddings"` (or similar)
  - `max_chatbots`
  - `max_documents`
  - `max_storage_bytes`
  - `max_canned_responses`
  - `allow_read_more` (bool)
  - `max_excerpts_per_reply` (e.g. 1 for Free, 3 for Green)
  - `max_excerpt_chars` (e.g. 600–1200)

- Add “trial state” handling:

  - `trial_ends_at`
  - `effective_plan = (now < trial_ends_at) ? trial_plan : paid_plan`
  - Free-after-trial should resolve to **LLM off + embeddings off**.

### B) Implement document ingestion pipeline with optional embedding

- Document upload → text extraction → normalization
- Chunking step:

  - fixed chunk size + overlap
  - store `doc_id`, `chunk_id`, `heading`, `position`, `content`, `content_hash`

- Indexing step always runs for Green/Free:

  - store Postgres FTS `tsvector` for each chunk (generated column or computed field)

- Optional embedding step:

  - if `allow_embeddings === true`, enqueue embedding job
  - store embeddings in `chunk_embeddings` (or in chunks table if you prefer)
  - ensure idempotency: embed only if `content_hash` changed

- Add plan enforcement at upload time:

  - reject uploads beyond `max_documents` / `max_storage_bytes`
  - if over, return a clean upgrade message (“Upgrade to Green to add more documents”)

### C) Implement retrieval engine with a “no LLM” response path

- Build a retrieval function that accepts `(bot_id, user_message, capabilities)` and returns:

  - `hits: [{chunk_id, doc_id, title/heading, score, excerpt, full_text?}]`
  - `confidence: high|medium|low`

- Retrieval behavior by plan:

  - **FTS-only mode** (Free-after-trial + Green):

    - query chunks via Postgres FTS ranking
    - optionally boost matches on headings/titles

  - **Embeddings mode** (Pro/Team if enabled):

    - vector search + (optional) rerank

- Response rendering (no LLM):

  - if confidence high:

    - return **excerpt card** (not full chunk)
    - include “Read more” only if `allow_read_more`
    - include “Open source” link

  - if confidence medium/low:

    - for Green/Free-after-trial: ask a deterministic disambiguation question or show top 2–3 headings (no LLM)
    - for Pro/Team: fall back to LLM with retrieved context

- Define “Read more” mechanics:

  - expand to full chunk (or next section) via a follow-up action
  - cap expanded output length (chars) per plan

### D) Add hard plan gating so LLM cannot leak

- Centralize capability checks in one server-side guard (server action / middleware / service):

  - `assertCanUseLLM(bot_id, user_id)`
  - `assertCanEmbed(bot_id, user_id)`

- Ensure **every** LLM call site goes through this guard.
- Ensure **every** embedding job enqueue goes through this guard.
- Add logging for denied attempts (helps debugging + abuse prevention).

### E) Stripe + DB: add the Green plan and map it to capabilities

- Create Stripe product/price for **Green**.
- Update webhook handling to set `subscription_plan = green`.
- Add `trial_ends_at` handling so Free users automatically transition to Free-after-trial behavior.
- Backfill/migration: existing users get sensible defaults for new capability flags.

### F) Update limits and UX for Free + Green

- **Free (after trial)**:

  - 1 chatbot
  - 1 document (long allowed, within size cap)
  - embeddings off, LLM off
  - FTS excerpts only
  - limited pre-configured responses (e.g., 20)
  - no read-more (or excerpts-only)

- **Green**:

  - 1 chatbot (or small number if you prefer)
  - more documents + higher storage (set your final numbers)
  - embeddings off, LLM off
  - FTS + read-more enabled
  - higher pre-configured response limit

- Enforce these limits in:

  - upload UI and API/server actions
  - admin/bot settings screens
  - backend validations (authoritative)

### G) Marketing site + docs updates

- Pricing table:

  - show Free → Green → Pro → Team (Enterprise as “Contact”)
  - clearly state “AI answers included for 30 days” on Free
  - clearly state Green: “No AI-generated responses”

- Update onboarding copy:

  - “After trial, your bot continues with saved responses + document search.”

- Update help docs:

  - how Green retrieval works (deterministic excerpts)
  - what “Read more” does
  - limitations (no generative answers)

### H) QA + tests (minimum viable)

- Unit/integration tests:

  - plan gating: LLM calls blocked on Green/Free-after-trial
  - embeddings job blocked when disabled
  - upload limits enforced
  - retrieval returns excerpts and respects `allow_read_more`

- E2E smoke tests:

  - Free during trial: AI works
  - Free after trial: AI blocked, FTS excerpts work
  - Green: FTS + read-more works
  - Upgrade Green → Pro triggers embedding job (if Pro has embeddings enabled)

If you want this turned into something Cursor-friendly, I can rewrite it as a single implementation prompt that references your Next.js + Supabase + server actions approach and the tables you’ll need.

---

Here’s a **single, clean Cursor prompt** that configures **both Free and Green** assuming the **deterministic retrieval (keyword / FTS → excerpts, no LLM)** system is being implemented now.

---

**Prompt for Cursor**

Implement plan configuration and enforcement for **Free** and **Green** plans using the new **deterministic document retrieval system** (keyword / full-text search returning excerpts directly in chat, no LLM generation).

### Shared assumptions

- A deterministic retrieval path exists that:

  - searches document chunks via keyword / FTS
  - returns short, readable excerpts directly in chat
  - does **not** call an LLM

- LLM generation and embeddings are controlled strictly by server-side plan capability checks.

---

### Free Plan configuration

- Free plan includes **1 chatbot**.
- Free plan allows **1 uploaded document** (may be long, within a reasonable size limit).
- Free users receive a **30-day trial** with:

  - AI-generated (LLM) responses enabled
  - Document embeddings enabled

- After the trial period ends:

  - **AI-generated (LLM) responses must be fully disabled**
  - **Document embeddings must be fully disabled**
  - The chatbot continues to function using:

    - pre-configured responses
    - deterministic document retrieval (keyword / FTS excerpts only)

- Free users may create up to **20 pre-configured responses**.
- Free plan uses deterministic excerpt responses only (no AI phrasing or synthesis).
- All limits and feature access must be enforced **server-side**.
- Effective plan state must be derived from subscription + `trial_ends_at`, not client-side flags.

---

### Green Plan configuration

- Green is a **paid, non-AI plan**.
- Green plan **never allows**:

  - AI-generated (LLM) responses
  - Document embeddings

- Green users can create **up to 1 chatbot**.
- Green users can upload **up to 20 documents** with a total storage limit of **100 MB**.
- Green users can create **up to 200 pre-configured responses**.
- Green bots use the same deterministic document retrieval system as Free-after-trial:

  - keyword / FTS search
  - excerpt-based responses rendered directly in chat

- Green may allow expanded deterministic features (e.g. more results, longer excerpts, “read more”), but **must not** introduce LLM or embeddings.
- All AI and embedding usage must be gated strictly by server-side plan checks so no LLM calls or embedding jobs can ever occur for Green.

---

### Implementation requirements

- Introduce or update a single **PlanCapabilities** source of truth defining:

  - `allow_llm_generation`
  - `allow_embeddings`
  - document limits
  - pre-configured response limits

- Enforce limits and capability checks in:

  - bot creation
  - document upload
  - retrieval / response generation

- Stripe subscription state must map cleanly to `free`, `green`, and `trial` behavior.
- Do not add new AI features or fallback logic beyond what is described here.

---

Here’s a clean **Cursor-ready prompt** describing the pricing page change:

---

**Prompt for Cursor**

Update the pricing page layout to **remove Enterprise as a pricing card** and present it as a **text-only option below the plan cards**.

Requirements:

- Display **four equal pricing cards**:

  - Free
  - Green
  - Pro (visually highlighted as the recommended plan)
  - Team

- Do **not** include Enterprise as a selectable pricing card.
- Below the pricing cards, add a simple, understated text section for Enterprise, for example:

  - “**Enterprise** — Custom limits, security, and deployment options. Contact us.”

- The Enterprise section should:

  - not list detailed features
  - not include pricing
  - not compete visually with the main plans
  - link to a contact or sales page

- Ensure the layout remains clean, balanced, and easy to scan, with Pro clearly positioned as the primary self-serve upgrade path.

This change is strictly about **pricing page presentation**; do not alter plan logic, subscriptions, or backend behavior as part of this task.

---

Here’s a **concise but comprehensive capability matrix** you can hand directly to Cursor as the **source of truth**. It reflects our latest decisions and keeps the mental model clean.

---

## Plan Capabilities (Authoritative)

### **Free (after 30-day trial)**

- **Chatbots:** 1
- **Documents:** 1 (long document allowed, within size cap)
- **Total storage:** small (implicit, tied to single doc)
- **Document processing:** chunking enabled
- **Document retrieval:** deterministic keyword / FTS excerpts
- **Read more / expand:** ❌
- **Embeddings:** ❌
- **AI-generated (LLM) responses:** ❌
- **Pre-configured responses:** 20
- **Customization:** basic
- **Trial behavior (first 30 days):**

  - LLM responses: ✅
  - Embeddings: ✅

- **After trial:** LLM + embeddings fully disabled
- **Support:** community / self-serve

---

### **Green**

- **Chatbots:** 1
- **Documents:** up to 20
- **Total storage:** 100 MB
- **Document processing:** chunking enabled
- **Document retrieval:** deterministic keyword / FTS excerpts
- **Read more / expand:** ✅ (deterministic only)
- **Embeddings:** ❌
- **AI-generated (LLM) responses:** ❌
- **Pre-configured responses:** 200
- **Customization:** basic–standard
- **Positioning:** non-AI, deterministic knowledge bots
- **Support:** standard email

---

### **Pro**

- **Chatbots:** up to 10
- **Documents:** ~50
- **Total storage:** 250 MB
- **Document processing:** chunking enabled
- **Document retrieval:** embeddings + AI-assisted answers
- **Read more / expand:** ✅
- **Embeddings:** ✅
- **AI-generated (LLM) responses:** ✅
- **Pre-configured responses:** 1,000
- **Customization:** advanced
- **API access:** ✅
- **Support:** priority

---

### **Team**

- **Chatbots:** up to 100
- **Documents:** ~200
- **Total storage:** 1 GB
- **Document processing:** chunking enabled
- **Document retrieval:** embeddings + AI-assisted answers
- **Read more / expand:** ✅
- **Embeddings:** ✅
- **AI-generated (LLM) responses:** ✅
- **Pre-configured responses:** 5,000
- **Team collaboration:** ✅
- **Analytics dashboard:** ✅
- **API + webhooks:** ✅
- **Support:** priority

---

### **Enterprise (not a pricing card)**

- **Limits:** custom
- **Features:** custom security, deployment, compliance
- **Access:** sales/contact only
