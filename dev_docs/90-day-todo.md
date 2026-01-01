Mark milestones with ☑️ or ✅ if complete.

1. ✅ **Nov 2, 2025** – – – Audit every document in `/docs`, reconcile priorities, and sketch a 90-day execution calendar that maps product and growth milestones.

2. ✅ **Nov 3, 2025** – – – Finalize technical architecture diagrams for teams/bots/documents and document Supabase table relationships with `team_id` propagation.

3. ✅ **Nov 4, 2025** – – – Create initial Supabase migration scripts for core tables (teams, bots, documents, conversations, embeddings, audit_log) and enable pgvector. Implement Row Level Security policies for each table, document policy rationale in the security spec appendix. Build strict environment validation helpers, wire Supabase client/server factories, and update `.env.example` to match. Finish authentication flow with Supabase magic links, profile bootstrap, and team membership creation. Implement user deletion cascade migration for automatic cleanup of user data.

4. ✅ **Nov 5, 2025** – – – Fix email confirmation redirect issue (currently redirects to `/protected` instead of `/`). Test user deletion cascade: verify that deleting a user from Supabase Auth properly cascades deletion of profile, teams, team memberships, bots, documents, conversations, and all related data. Add debug logging to callback route and verify redirect behavior. Implement "Delete My Account" feature in settings page with confirmation dialog, warning about data deletion, and proper error handling. This ensures users can self-service account deletion and tests the cascade deletion flow end-to-end. Test magic link. Create ui / ux for magic link. Scaffold dashboard layout using ShadCN components, Tailwind tokens, and responsive navigation patterns planned in `roadmap.md`.

5. ✅ **Nov 6, 2025** – – – Build bot CRUD server actions, enforce slug uniqueness, and surface optimistic toast notifications for create/edit flows. Implement API key generation UI with hashed storage, masking, deletion, and audit logging per `docs/security.md`.

6. ✅ **Nov 7, 2025** – – – Wrap OpenAI access with moderation middleware, standardize error responses, and log flagged categories for review. Convert the chat API route to SSE streaming end-to-end so the UI receives incremental deltas as outlined in `README_TODO.md`. Persist conversations and messages via `saveChatToDatabase`, expose recent history in the dashboard, and allow clearing threads.

7. ✅ **Nov 8, 2025** – – – Add dashboard analytics cards for bots, documents, conversations, and API calls, using real metrics when available. – Ship document upload form that accepts paste and `.md` files, stores raw content, and enforces the tag requirements defined in UI copy. – Enable bot linking/global toggles for documents, add validation, and ensure linking updates show instantly in the list view. – Build ingestion pipeline service that chunks text (~600 tokens), computes hashes, and queues embedding jobs. – Integrate OpenAI `text-embedding-3-small`, store vectors in pgvector, and attach canonical URLs for source citations.

8. ✅ **Nov 9, 2025** – – – Create retrieval helper that embeds queries, filters by linked/global docs, deduplicates results, returns structured chunks, and keeps relevant documents “pinned” across follow-up turns so conversation context persists without repeating keywords.Inject retrieved chunks into chat prompts with token budgeting, annotate sources, avoid duplicate document injections, and draft Terms, Privacy, and Security pages using `docs/security.md` as the baseline before publishing under `/legal`.

9. ✅ **Nov 10, 2025** – – – Design the marketing landing hero, feature grid, and CTA informed by `branding.md`, and add a live demo bot section.

10. ✅ **Nov 11, 2025** – – – Integrate Stripe Checkout with Free, Pro, and Team plans, including customer portal links and webhook scaffolding.

11. ✅ **Nov 12, 2025** – – – Implement plan-based quotas for documents, embeddings, and messages, surfacing upgrade prompts when thresholds approach.

12. ✅ **Nov 13, 2025** – – – Fix the rate limiter off-by-one bug, add plan-aware limits, and log rate-limit events for analytics. Expand audit logging to cover bot/document CRUD, API key changes, and billing updates with user attribution. Polish the in-app chat UI with streaming indicators, abort/retry controls, and fallback messaging for blocked prompts.

13. ✅ **Nov 14, 2025** – – – Write automated tests covering moderation flow, RLS enforcement, and retrieval correctness using realistic fixtures. Configure monitoring: connect Vercel Analytics, enable Supabase logs, and prepare Sentry integration (deferred until the Next.js 16-compatible SDK ships). Implement document deletion workflow that removes storage files, embeddings, and audit entries; verify hard-delete timing.

14. ✅ **Nov 15, 2025** – – – Build team invitation UI to add members, assign roles, and validate permissions end-to-end. Note: Consider team UX design patterns and workflows in advance (multi-member collaboration, role management, invitation flows) to ensure a polished experience.

15. ✅ **Nov 16, 2025** – – – Deep-dive team collaboration testing: add dual personal vs team sections, tighten role controls, and run end-to-end invite stress tests to ensure scalability.

16. ✅ **Nov 17, 2025** – – – Record a Loom walkthrough of the MVP (bot creation → doc upload → chat) for early adopters and store it in marketing assets.

17. ‼️ **On-Going** – – – Curate an outreach list of 25 target teams (agencies, SaaS, CS leaders) with notes, contact channels, and warm intro angles.

18. ‼️ **On-Going** – – – Draft email templates for manual onboarding, include Loom link, and schedule first three discovery calls.

19. ‼️ **On-Going** – – – Launch a soft beta by onboarding three pilot teams, gathering feedback in a shared Notion doc, and logging bugs in Linear.

20. ✅ **Nov 20, 2025** – – – Give chat memory of last 10 replies so we can carry on a conversation. As of now I think the bot forgets it's last response.

21. ✅ **Nov 21, 2025** – – – Optimize document ingestion throughput: add background workers for embedding jobs, implement chunk caching to reduce OpenAI API calls, and monitor processing queue health. Build public API endpoints with authentication, comprehensive API documentation (OpenAPI/Swagger), and onboarding flow for API users including embedding job status tracking.

22. ✅ **Nov 22, 2025** – – – Complete Stripe price setup: verify test and live mode price IDs in Vercel environment variables, ensure homepage pricing displays correctly, and test checkout flow end-to-end. Fix any build-time Stripe API errors by ensuring all price IDs exist in the configured Stripe account.

23. ✅ **Nov 23, 2025** – – – Implement Stripe webhook event logging and idempotency: Create `billing_events` table in Supabase to store all Stripe webhook events (event ID, type, customer ID, subscription ID, full JSON payload, timestamps). Add helper function to log events before processing. Update webhook handler to: (1) log event to `billing_events` table first, (2) check for duplicate `stripe_event_id` to prevent reprocessing (idempotency), (3) then process event normally. Add indexes on `stripe_event_id`, `customer_id`, `subscription_id`, `type`, and `received_at` for efficient queries. This provides full audit trail, enables debugging of webhook retries and out-of-order events, allows sync verification between DB state and Stripe events, and supports future diagnostic/admin pages to inspect webhook history.

24. ✅ **Nov 23, 2025** – – – Implement document moderation flags, show alerts in the dashboard, and block flagged docs from retrieval.

25. ✅ **Nov 23, 2025** – – – Add conversation export (CSV/JSON) and "private mode" toggle to respect retention requirements in the security spec.

26. ✅ **Nov 24, 2025** – – – Structure application logs, redact sensitive data, and route errors to Sentry with alert thresholds.

27. ✅ **Nov 24, 2025** – – – Build a usage meter widget that visualizes message/doc consumption per plan and links to the upgrade flow at 80% usage.

28. ✅ **Nov 25, 2025** – – – **BOT PAGE CUSTOMIZATION - SUBDOMAIN SETUP**: Set up subdomain architecture for customized bot pages using Next.js route groups within the same project (not a separate project). Create `(bot-pages)` route group in `src/app/(bot-pages)/[slug]/` for `bot.chatiq.io` subdomain. Update middleware to detect hostname (`bot.chatiq.io` vs `chatiq.io`) and route accordingly. Configure Vercel/domain routing to handle `bot.chatiq.io` subdomain pointing to the same deployment. Set up minimal layout structure optimized for public bot pages (no dashboard navigation, clean interface) in `(bot-pages)/layout.tsx`. Add database migration to `bot_bots` table: `primary_color` (hex), `secondary_color` (hex, optional), `back_link_url` (text), `back_link_text` (text, optional). **Access Control**: Implement bot visibility rules: (1) `bot.chatiq.io/[slug]` - Only accessible if `is_public = true` AND `status = 'active'`, no authentication required (public-facing bots for embedding). (2) `chatiq.io/chat/[slug]` - Requires authentication, accessible to team members only (for both public and private bots, internal/admin view). Private bots (`is_public = false`) return 404 on `bot.chatiq.io` and are only accessible via `chatiq.io/chat/[slug]` with proper team membership verification. **Note**: API access (`/api/chat`) is already correctly configured - API keys work for both public and private bots (no `is_public` check needed, as API keys are authentication). This approach shares components, utilities, and database connections while maintaining clean separation via route groups, avoiding styling conflicts, and ensuring private/internal bots remain secure.

29. ✅ **Nov 26, 2025** – – – **BOT PAGE CUSTOMIZATION - DEVELOPMENT**: Implement bot page branding and customization features. Create "Branding & Customization" section in bot settings/edit page (main app) with color pickers, back link URL input, and live preview. Build minimal bot page layout at `bot.chatiq.io/[slug]` that reads customization from database. Apply custom colors via CSS variables for buttons, accents, and progress bars. Add "Back to [Site]" link in bot page header that navigates to user's site. Share Chat components between main app and bot subdomain. Test custom styling, ensure colors apply correctly, and verify back link functionality. This creates seamless brand integration when users embed or link to their bot, making it look like a native part of their site rather than a third-party widget.

30. ✅ **Nov 27, 2025** – – – Research Stripe best practices for products and pricing architecture. Review Stripe documentation on product organization, price tiers, metered billing, and subscription lifecycle management. Reconfigure Stripe products and prices in both test and live modes to align with platform best practices, ensuring proper metadata, clear naming conventions, and optimal structure for future scalability.

31. ✅ **Nov 28, 2025** – – – **PUBLIC BOT ACCESS STRATEGY**: Define and implement access strategy for the default/public bot used by the app to interface with clients. Currently the bot does not respond to unauthorized users. Determine: (1) Should the public bot be accessible to all visitors or require authentication? (2) If public access is allowed, what are the rate limits and usage restrictions? (3) How to handle lead capture and escalation for unauthenticated users? (4) What bot capabilities should be available to public vs authenticated users? (5) How to prevent abuse while maintaining a good user experience? (6) Should there be a public demo mode with limited functionality? Implement the chosen strategy, update bot access controls, and test with both authenticated and unauthenticated users before public launch. Also make sure user's public bots seen at bot.chatiq.io are linked from the bots in the dashboard, give the user a copy-able url for their public bot.

32. ✅ **Nov 29, 2025** – – – **PRE-CONFIGURED RESPONSES WITH FUZZY MATCHING**: Implement pre-LLM pre-configured response system for instant, zero-cost responses to common queries. Create `canned-responses.ts` with pattern matching for obvious messages (greetings like "hi", "hello", "thanks", etc.) that return immediate responses without calling the LLM. Implement simple fuzzy matching: (1) Pattern matching with regex for variations (e.g., `/^(hi|hello|hey|greetings)/i`), (2) Levenshtein distance for typo tolerance (e.g., "helo" → "hello" within 1 character difference), (3) Keyword matching for common phrases. The pre-configured responses should be 'per bot' and available to every user to customize individually in bot settings. Add fallback error handling in `handleChatRequest()` to return friendly messages when OpenAI API is unavailable or fails, instead of throwing errors. Benefits: instant responses (<5ms), zero cost for common interactions, better UX during outages, improved system reliability. Ensure responses are contextually appropriate and don't break conversation flow. This handles 20-30% of queries instantly with zero API costs.

33. ✅ **Nov 30, 2025** – – – **AUTOMATIC RESPONSE CACHING WITH EMBEDDING-BASED FUZZY MATCHING**: Implement automatic caching system that stores OpenAI responses and uses embedding-based similarity matching to find similar questions. Create `bot_response_cache` Supabase table (id, bot_id, cache_key, message, response, message_embedding, system_prompt_hash, hit_count, created_at, expires_at). Before calling OpenAI API: (1) Normalize incoming message (lowercase, trim, remove extra spaces), (2) Generate embedding for the message using `text-embedding-3-small`, (3) Query cache using vector similarity search (pgvector) with similarity threshold (0.85), (4) If match found, return cached response (simulate streaming for UX consistency). After OpenAI response: (1) Save response to cache with message embedding, (2) Include system prompt hash for cache invalidation when bot prompt changes. Implement cache invalidation: when bot system prompt changes, on bot deletion, TTL expiration (30 days), manual admin clear. Benefits: 40-50% cache hit rate on common queries, ~70% cost reduction, faster responses (~50ms vs ~1000ms), learns from actual usage patterns. This complements pre-configured responses by handling variations of questions that have been asked before.

✅ Check on privacy mode. Does privacy mode keep messages from being saved, thus bypassing quotas??

34. ✅ **Nov 30, 2025** – – – **ADMIN COST MONITORING DASHBOARD**: Build comprehensive admin dashboard for real-time cost tracking and usage analytics. Create `admin_cost_tracking` Supabase table (id, timestamp, team_id, bot_id, user_id, cost_type, model, input_tokens, output_tokens, total_tokens, cost_usd, cache_hit, ip_address, metadata) with indexes on timestamp, team_id, and hourly buckets. Implement cost tracking in chat handler: log every OpenAI API call with token counts, model used, and calculated cost. Track embedding generation costs, moderation API costs (if used), and cache hit/miss rates. Build admin dashboard UI with: (1) Real-time cost overview (hourly/daily/weekly trends, total spend, projected monthly burn), (2) Cost breakdown by team/user/bot, (3) Cache performance metrics (hit rates, cost savings), (4) Model usage analytics (gpt-3.5-turbo vs embeddings breakdown), (5) Top spenders and usage patterns, (6) Cost alerts for unusual spikes or budget thresholds. Add admin-only access controls (role-based), RLS policies, and audit logging. Benefits: monitor burn rate in real-time, identify cost optimization opportunities, catch abuse early, make data-driven pricing decisions, track ROI per customer. This enables proactive cost management and helps optimize free tier limits and caching strategies.

35. ✅ **Dec 3, 2025** – – – **UNIVERSAL JAVASCRIPT WIDGET & EMBED GENERATOR**: Build a universal JavaScript widget that works in any website (vanilla JS, React, Vue, Angular, plain HTML). Create a standalone widget script that can be loaded via `<script>` tag, similar to Intercom/Drift. The widget should: (1) Load asynchronously without blocking page load, (2) Support customizable positioning (bottom-right, bottom-left, inline), (3) Support theme customization (colors, size, position), (4) Handle authentication via API key or public bot slug, (5) Work across all browsers and frameworks. Build an embed generator UI in the dashboard that lets users: customize theme (colors, position, size), preview the widget, and copy a ready-to-use script tag with their bot's API key/slug embedded. The script tag should be simple: `<script src="https://chatiq.io/widget.js" data-bot-slug="my-bot"></script>`. Benefits: works for 100% of users regardless of their tech stack, easy one-line integration, no framework dependencies. This is the primary embed solution that most users will use. **Critical for launch** - enables non-technical users to embed bots immediately.

36. ✅ **Dec 1, 2025** – – – Author onboarding email sequence (welcome, setup guide, upgrade nudge) and connect triggers via Stripe webhooks.

37. ✅ **Dec 3, 2025** – – – Build the marketing blog section (route, layout, MDX/CMS wiring), publish blog post one ("Build your team's AI support bot in 10 minutes"), and schedule multi-channel promotion.

‼️ 📖 **Dec 4, 2025** – – – Collect testimonials from pilot teams, secure permission to use logos, and add them to the landing page trust section.

38. ✅ **Dec 5, 2025** – – – **E2E TESTING WITH PLAYWRIGHT**: Set up Playwright for end-to-end testing of critical user flows. Install Playwright, configure test environment with test database, and write E2E tests for: (1) User sign-up and authentication flow, (2) Bot creation and editing, (3) Document upload and linking to bots, (4) Chat functionality (send message, receive streaming response), (5) Public bot access (homepage default bot, floating widget), (6) Rate limiting and quota enforcement, (7) Error handling (moderation flags, rate limits, API failures). Configure test fixtures for Supabase test data, mock OpenAI API responses where appropriate, and ensure tests can run in CI/CD. Benefits: catch regressions before deployment, ensure critical paths work end-to-end, confidence in launch readiness. Run E2E test suite as part of pre-launch checklist.

39. ‼️ **Dec 6, 2025** – – – **CI/CD TESTING PIPELINE**: Set up GitHub Actions workflow to automatically run tests on every PR and push to main. Configure workflow to: (1) Run Vitest unit tests (moderation, RLS, retrieval), (2) Run Playwright E2E tests in headless mode, (3) Run linting and type checking, (4) Block PR merges if tests fail, (5) Generate test coverage reports (optional). Add status badges to README showing test status. Configure separate workflows for: PR validation (fast feedback), main branch (full test suite), and release builds (production checks). Benefits: catch bugs early, prevent broken code from merging, maintain code quality, automate testing workflow. This ensures all code changes are validated before reaching production.

40. ‼️ **TBD** – – – **REBUILD TESTING FROM SCRATCH**: Tear down existing testing infrastructure and rebuild methodically with full understanding. Current state: Multiple workflows failing, unclear error messages, testing feels like a black box after 3+ hours of debugging. Goal: Build testing knowledge from ground up. Steps: (1) **LEARNING PHASE**: Study testing fundamentals - what is unit testing vs integration vs E2E, when to use each, what makes a good test. Learn GitHub Actions basics - how workflows work, what triggers them, how to debug failures, reading logs effectively. (2) **CLEAN SLATE**: Remove all existing CI/CD workflows (.github/workflows/\*.yml), disable any automated testing, document current test files but don't run them. (3) **LOCAL FIRST**: Get tests working perfectly locally before any CI. Ensure `npm run typecheck`, `npm test`, `npm run test:e2e` all pass reliably on local machine. Understand each command, what it does, why it might fail. (4) **SINGLE WORKFLOW**: Create ONE minimal GitHub Actions workflow. Start with absolute simplest check (e.g., "does code compile?"). Verify it works, understand the logs, see it pass. Then add ONE check at a time, verifying each step works before moving to next. (5) **DOCUMENT LEARNINGS**: Document what each test does, why it exists, how to run it locally, how to debug when it fails. Create a testing guide for future reference. (6) **GRADUAL EXPANSION**: Once basic workflow is solid, add checks one by one: type checking → linting → unit tests → build → E2E tests. Test each addition thoroughly before moving forward. (7) **UNDERSTAND FAILURES**: When something fails, stop and fully understand WHY before trying to fix. Read error messages completely, research the issue, understand the root cause. Don't apply quick fixes without understanding. Benefits: Deep understanding of testing, confidence in debugging, sustainable testing infrastructure that we can maintain and expand. This is a learning investment that will pay off long-term. Estimated time: 1-2 full days of focused learning and rebuilding.

41. ✅ **Dec 7, 2025** – – – **IMPORT FROM URL (MVP - SINGLE PAGE)**: Ship single-page URL import feature. User provides a URL (e.g., `https://site.com/docs/getting-started`), system fetches the page, extracts and sanitizes HTML content (removes scripts, navigation, ads), converts to clean text, and creates a single document that feeds into the existing ingestion pipeline (chunking, embedding). Implementation: Add URL input field to document form, create server action/API endpoint that uses `cheerio` or `@mozilla/readability` for HTML parsing, handle errors (404, timeouts, invalid URLs), validate URL format, set reasonable size limits, and feed extracted text into existing `ingestDocument()` function. This MVP solves 80% of use cases (importing individual blog posts, help articles, specific documentation pages) without the complexity of multi-page crawling. Keep it simple: one URL → one document. Estimated time: 2-3 days. **Status**: ✅ COMPLETE - Implemented and tested. Available to all plans (free, pro, team, enterprise).

42. ✅ **Dec 8, 2025** – – – **LIVE PAYMENT TESTING (PARTIAL)**: Completed initial live payment testing with test prices. **COMPLETED**: (1) Created low-cost test prices ($0.50/$1.00 USD) in Stripe live mode using `./scripts/create_live_test_prices.sh` script, (2) Added test price IDs to live environment variables (`STRIPE_PRICE_PRO_USD_LIVE`, `STRIPE_PRICE_TEAM_USD_LIVE`, etc.), (3) Added features for free tier trial period (30-day time-limited free tier with graceful degradation - pre-configured responses continue working, LLM blocked after expiry), (4) Tested live pricing checkout flow: successfully subscribed to Pro plan with real credit card, verified subscription activation, tested cancellation flow (worked correctly), confirmed webhook events received and processed. **REMAINING TESTING**: See item 43 for additional testing tasks (Team plan checkout, upgrade/downgrade flows, billing portal, edge cases, webhook verification, production price replacement).

43. ‼️ **Dec 9, 2025** – – – **LIVE PAYMENT TESTING (REMAINING)**: Complete remaining live payment testing tasks. (1) Test Team plan checkout flow: initiate checkout for Team plan, complete payment with real credit card, verify subscription activates correctly, verify plan updates in database. (2) Test subscription management: upgrade from Pro to Team, downgrade from Team to Pro, verify plan changes reflect correctly in database and UI, test reactivation of canceled subscription. (3) Test billing portal: access customer portal, update payment method, view invoices, download receipts, verify all portal features work correctly. (4) Verify webhook event logging: check `billing_events` table captures all events correctly, verify idempotency prevents duplicate processing, test webhook retry scenarios. (5) Test edge cases: expired cards, declined payments, failed webhooks, out-of-order events, verify error handling and user messaging. (6) Verify production database: ensure `stripe_customer_id` links correctly, plan updates propagate correctly, no test mode data leaks, verify data integrity. (7) After all testing completes: replace test price IDs with actual production prices in environment variables (`STRIPE_PRICE_PRO_USD_LIVE`, `STRIPE_PRICE_TEAM_USD_LIVE`, `STRIPE_PRICE_PRO_THB_LIVE`, `STRIPE_PRICE_TEAM_THB_LIVE`). (8) Document any issues found and create fixes before launch. This ensures payment infrastructure works flawlessly for all scenarios before public launch.

44. ✅ **Dec 10, 2025** – – – **LIVE PAYMENT TESTING (CONTINUED)**: Additional day for thorough live payment testing and tuning. Continue testing and refining: (1) Complete any remaining test scenarios from item 43, (2) Test geo-detection currency switching (USD vs THB) with different locations, verify pricing displays correctly, test checkout flow with both currencies, (3) Test subscription upgrades/downgrades with different currencies, verify currency persistence, (4) Verify billing currency auto-detection and syncing from existing subscriptions, (5) Test edge cases discovered during initial testing, (6) Fine-tune any UI/UX issues found in billing flows, (7) Verify all webhook events are processed correctly, (8) Test cancellation and reactivation flows, (9) Final verification of production price IDs before replacing test prices, (10) Document all findings and ensure all issues are resolved. This additional day ensures comprehensive testing coverage and confidence in the payment system before launch.

45. ✅ **Dec 11, 2025** – – – Replace live prices to correct prices.

46. ✅ **Dec 12, 2025** – – – Set up /contact page. dashboard/admin/messages etc. create a notification for unread contact messages in the dashboard.

47. ✅ **Dec 13, 2025** – – – Set up social sites for chatiq. see contact page for which sites to set up? Set up email contact etc. Linked in, X.

48. ✅ Check, test roll-base permission, rls, etc. know the flow.

49. ✅ **Dec 14, 2025** – – – Cost analysis for free and paid users. Cost projections. Will I lose money from my free tier? finish or improve /dashboard/admin/costs cost monitoring.

50. ✅ Modify Editors to be much more friendly. Create mode should be ai assisted. to ask relevant questions an create a functioning bot in just a couple of minutes. Users can be prompted for company name. web address (the website can be automatically imported as a document). tone. product description.

51. ✅ **Dec 18, 2025** – – – tune canned responses. default bot should work well. now canned responses seem to be blocking ai. maybe most should be disabled by default. I think a better syntax for adding keywords is necessary, maybe an 'intent' input and the regex below. novice users should be able to rely on the system prompt. let's set up limits for amount of characters in the system prompt and the default response. pre-configured response interface should automatically save the enabled / disabled when the switch is toggle. Note: new pre-configured response cannot be added.

52. ✅ **Dec 19, 2025** – – – Tune document search. should have a drop down to search by bot. improve the interface to edit the documents increase text size.

53. ✅ **Dec 20, 2025** – – – **RESPONSIVE DESIGN REVIEW**: Conduct comprehensive responsive design audit across all pages and components. Test on multiple devices (mobile phones, tablets, desktop) and screen sizes. Verify: (1) Dashboard layout adapts correctly on mobile (sidebar, navigation, tables), (2) Chat interface is usable on small screens, (3) Forms and inputs are properly sized and accessible, (4) Tables are scrollable or use responsive patterns on mobile, (5) Modals and dialogs work on all screen sizes, (6) Typography scales appropriately, (7) Touch targets are adequate for mobile, (8) No horizontal scrolling issues, (9) Images and media are responsive. Document any issues and fix before public launch. Review styling for public bot, project: chat-bot-pages. fix the bots project so that the bot at least renders markdown.

54. ✅ **Dec 21, 2025** – – – Implement deterministic document chunk search and excerpt-based responses that work without LLMs or embeddings, with plan-level flags to enable or disable AI generation, embeddings, and “read more” behavior.

55. ✅ **Dec 24, 2025** – – – **BRANDING & INTERFACE CHECKLIST**: Complete pre-launch branding and interface audit. Verify: (1) All icons are properly implemented and consistent across the application (dashboard, chat, navigation, buttons), (2) Favicon and app icons are set up correctly (favicon.ico, apple-touch-icon, manifest icons for PWA), (3) Logo appears correctly in header, footer, and all marketing pages, (4) Brand colors and typography are consistent throughout (check dark mode compatibility), (5) Basic documentation is prepared and accessible (README, API docs, integration guides), (6) No broken links exist (test all internal links, external links, API endpoints, documentation links), (7) Meta tags are properly configured (title, description, OG tags for social sharing), (8) Error pages (404, 500) are branded and user-friendly, (9) Loading states and empty states use consistent branding, (10) All placeholder text and "coming soon" sections are either completed or removed. Create a checklist document and verify each item before public launch. thoroughly examine the grid background in light mode make sure that it works well and does not exhibit peculiar behavior on navigation.

56. ✅ **Dec 27, 2025** – – – **LINE basic integration**: Add LINE webhook endpoint, signature verification, bot mapping (channel → bot), and reply flow. Document setup steps for LINE OA + Messaging API channel.

57. ✅ **Dec 28, 2025** – – – **LINE Flex message formatting**: Convert internal markdown to LINE-compatible Flex messages (start with basic headings, links, lists), with fallback to plain text.

UI TODO: LINE Integration Setup

Add team-level Integrations page (LINE/Facebook/WhatsApp tabs).
Create “Add LINE Integration” form:
Select bot
Channel ID / Channel Secret / Channel Access Token
Show webhook URL after save
List existing integrations with status, bot, created_at.
Support edit (rotate token/secret), disable, delete.
Mask secrets in UI (show only last 4).
Add success + error toasts and validation.
Link to LINE setup guide (dev_docs/line-integration.md).
Update bot settings page with “Channels” summary + link to Integrations page.

‼️ Check all flows, changed to www already.

hide embedded bots after evaluation period.

58. ** Dec 3**1\*\* Line App interface in conversations. Live line conversations. bot + human. escalation, conversation type, notifications, summary.

Work on conversation interface. may need work.

1. Better chat titles (LLM‑generated)

Add columns to bot_conversations: title_auto, title_manual, title_source, title_updated_at.
Decide title strategy: run after N user messages or after first bot response.
Add a background job to generate a title (LLM prompt: “Summarize in 3–6 words”).
Store result in title_auto; use title_manual if set.
Update UI to show/edit manual title in conversation header + list.

2. Automatic conversation categorization

Add columns: category, category_confidence, category_source, category_updated_at.
Define a per‑bot category list (configurable) or global defaults.
Implement a classifier step (rules first, LLM fallback).
Run classification after N user messages and on new messages if still “uncategorized.”
Show category in /dashboard/conversations and filters.

59. ✅ **Dec 29, 2025** – – – **Bilingual (Thai) support readiness**: Make deterministic snippet matching language-aware (current plural/suffix normalization is English-only); evaluate Thai tokenization for chunking and search; decide whether to route Thai queries through embeddings-only retrieval; add Thai locale strings for UI, emails, and system prompts; add Thai test docs + queries for retrieval QA.

Add language routing for preconfigured responses: add language field to response records, detect prompt language on request, filter candidate responses by language with fallback to English, and add a simple UI selector when creating/editing responses.

3. ✅ Escalation + notifications

Add tables: bot_escalation_rules (per bot) and bot_escalations (events).
Rules: keyword match, category match, sentiment threshold, manual “escalate” button.
When a rule triggers, create bot_escalations record and send notification.
Support notification channels: email, Slack webhook, internal admin inbox.
Add UI for rule management + escalation timeline on conversation view.

59. ✅ TODO: Implement an “Evaluation Plan” for the B2B chatbot platform. Define a first-class Evaluation Plan (not labeled as “Free”) that allows anyone to trial the product under clearly controlled conditions. Set a fixed evaluation duration (e.g. 14 days) and decide whether a credit card is required for activation. Enforce strict, hard usage caps (e.g. 1 bot, 5 documents, 200–500 messages, limited storage/vector rows) and explicitly disable production-only features such as live customer embedding, white-labeling, SLAs, and priority support. Add backend logic to track evaluation start and expiry, enforce limits at the API/server-action level, and gracefully block usage when limits or time are exceeded. In the UI, display a persistent “Evaluation Mode” banner, visible usage meters, and an expiry countdown, with timed reminders and upgrade prompts as the evaluation progresses. Update the pricing page to position the Evaluation Plan as a professional trial (“validate fit before purchase”), avoiding freemium language, and add clear upgrade paths to paid plans. Finally, ensure legal coverage by adding a non-production clause to the Terms, and instrument analytics to track evaluation activations, usage, expiry, and conversion to paid plans.
    TODO: Add seat expansion support for Business plan (paid add-on seats). Define billing model in Stripe (seat add-on price), store purchased seat count on `bot_teams`, enforce expanded seat limits in invites/accept flow, and surface seat upgrade UI in billing/team pages.

‼️ Recheck SEO - not finished. see: dev_docs/SEO checklist.md

look into models... are we using 3.5 or 4.0 mini? is our model reliable?

60. Mobile PWA Shell – TODO

Scope: separate lightweight mobile interface (full‑screen) that consumes existing APIs; no backend duplication.
Auth: use Supabase auth in PWA; reuse session cookies or token flow.
Core screens: Conversations list → Conversation detail → Profile/settings.
APIs to use:
GET /api/conversations/{id}/messages (poll or realtime)
POST /api/integrations/line/send (human reply)
POST /api/conversations/{id}/takeover (toggle takeover)
Existing conversations list (getConversations or API wrapper)
Realtime: Supabase Realtime on bot_messages + bot_conversations (fallback poll every 5s).
UI: minimal layout, full‑screen, big tap targets, offline‑safe styling, home‑screen install.
PWA setup: manifest, service worker, icons, theme color, display: standalone.
When you’re ready, we can expand this into a full spec + build plan.

61. revise tiers marketing / prices: see this document dev_docs/tiers.md

56.‼️ **Dec 30, 2025** – – – SEO check. Prepare full SEO foundations by ensuring every page has complete metadata (title, description, canonical, OpenGraph), using server components for indexed content, generating a dynamic sitemap.ts and robots.txt, optimizing images and fonts to eliminate layout shift, maintaining clean URL structures, adding structured data (BlogPosting, SoftwareApplication, FAQ), setting up internal linking, author bios, and long-form content pages, implementing dynamic OG images, defining consistent heading hierarchy, avoiding duplicate/thin content, enabling caching with revalidate, securing the site with HTTPS and clean Privacy/Terms pages, validating performance with Lighthouse (CLS, JS size, image formats), creating navigation structure with semantic HTML, submitting sitemap to Google Search Console and Bing Webmaster Tools, and maintaining SEO-ready resources such as documentation sections, blog posts, categories, and updated modified dates. cookie consent banner.

make sure database is updating (free tier at sb)

58. make mobile widget fully full screen.

59. 📖 **Dec 31, 2025** – – – **FREE TIER EXPIRY ALERTS & EMAILS**: Implement UI alerts and email notifications for free tier users whose trial is about to expire or has expired. **UI Alerts**: (1) Add countdown banner to dashboard showing days remaining (when ≤7 days), (2) Add prominent alert banner when trial has expired explaining that pre-configured responses still work but LLM is blocked, (3) Add upgrade CTA buttons in alerts linking to billing/upgrade page, (4) Show alerts on dashboard, bot pages, and chat interface. **Email Notifications**: (1) Create email template for trial expiry warnings (days 28, 29, 30), (2) Create email template for expired trial notification, (3) Set up periodic email job/cron to send warnings (day 28, 29, 30) and expired notification (day 31+), (4) Email should clearly explain: pre-configured responses still work, LLM is blocked, upgrade path to restore full functionality, link to upgrade page. **Implementation**: Use existing `isFreeTierExpired()`, `getFreeTierDaysRemaining()`, `isInFreeTierWarningPhase()` helpers from `src/lib/plans/free-tier-expiry.ts`, integrate with existing email system (Resend), add dashboard components for alerts, create email templates similar to existing upgrade nudge emails. This ensures users understand their bot's current capabilities and are encouraged to upgrade.

60. TODO: Make human takeover timeout configurable per bot/team (e.g., `human_takeover_timeout_seconds`). Add settings UI, default fallback, and use it in takeover routes, LINE send, and takeover-expiration worker.

61. 📖 **Dec 25, 2025** – – – **PRE-LAUNCH MANUAL TESTING CHECKLIST**: Complete comprehensive manual testing of all critical user flows before public launch. Test each flow end-to-end and verify functionality. Checklist: (1) **User Sign-Up/Sign-In**: New user can create account, email verification works (if enabled), user can sign in successfully, password reset flow works. (2) **Bot Creation**: User can create a bot, bot settings save correctly, bot appears in dashboard, bot can be edited, bot can be deleted. (3) **Document Upload**: User can upload a document (PDF, text, markdown), document processes successfully, document appears in library, document can be linked to bot, document can be edited/deleted. (4) **Chat Functionality**: User can send a message, bot responds with streaming, response is relevant to uploaded documents, chat history saves correctly, conversation can be exported. (5) **Payment Flow**: User can upgrade to Pro plan, Stripe checkout works with test cards, subscription activates correctly, user can access billing portal, upgrade/downgrade flows work, cancellation works. (6) **Public Bot Access**: Public bot is accessible at `/chat/[slug]`, widget can be embedded on external site, chat works on public page, widget styling is correct, mobile responsiveness works. Document any bugs found, fix critical issues immediately, verify all fixes work. This ensures launch-day confidence and prevents critical failures. Estimated time: 4-6 hours of focused testing.

test transactional emails here: docs/transactional-email-testing.md

Improve interface for bot creation flow.

add option to to hide the privacy mode lock for the public bot.

59. 📖 **Jan 1, 2025** – – – update the bot.chatiq.io page. update style. make the private mode optional.

make the onboarding more clear. success message when a bot is created should be more explicit, clear.

make sure users can unsubscribe from emails.

60. 📖 **Jan 2, 2025** – – – decide how long to persist chats in the window so a reloaded chat will load the current conversation for say 1 hour (default) to however long we set it in the settings pane. Save chat to local storage, or fetch from db... for the designated, so it reloads in the chat history.

61. Change pricing and marketing, stripe etc to match current pricing strategies.

62. Define a marketing style that fits you brand, image creation for the blog etc. align with current business expectations. light fun appealing striking. look at some of the best client work from product companies you are targeting.

63. 🚀 **Jan 3, 2025** – – – **PUBLIC LAUNCH**: Disable beta mode, remove email allowlist restrictions, open public sign-ups, announce launch on Product Hunt/Indie Hackers, and monitor initial traffic. Verify all critical paths work (sign-up, bot creation, document upload, chat, widget embedding). Set up launch-day monitoring and support channels.

64a. 📖 **Dec 28, 2025** – – – **Facebook Messenger integration**: Add webhook endpoint, signature verification, page/app setup instructions, bot mapping, and reply flow via Meta Graph API.

65. 📖 **Dec 29, 2025** – – – Improve documentation search, so that documents can be searched for internal content.

66. 📖 **Dec 30, 2025** – – – Implement an AI-assisted **Response Builder** that helps users create pre-configured responses from a trigger and a natural-language description. The tool should generate draft response text and expanded trigger variants in a preview-only state (never auto-save), with the user reviewing and editing before saving. Availability must be gated by plan: shown as an upsell or limited during Free trial, available in Green with a clear warning that AI is used for setup only (bot replies remain non-AI), and fully available in Pro/Team. Enforce strict server-side limits and monthly generation caps, run moderation checks, avoid regex by default, insert placeholders instead of hallucinating facts, and ensure the tool is never used during live chat responses. See this document for details: docs/canned-response-builder.md

67. 📖 **Dec 31, 2025** – – – Reduce chat latency by caching embeddings, prefetching linked docs, and streaming responses immediately to the client.

68. 📖 **Jan 1, 2026** – – – Enhance the document library with filters, search, status badges, and optimistic updates on CRUD actions.

69. 📖 **Jan 2, 2026** – – – Add an onboarding checklist component in the dashboard that tracks bot creation, doc upload, and embed completion.

70. 📖 **Jan 3, 2026** – – – Implement conversation deletion with confirmation modals, audit entries, and immediate UI refresh.

71. 📖 **Jan 4, 2026** – – – Gate premium features (crawler, analytics) behind Pro+ plans, test downgrade messaging, and ensure feature flags work.

68b. 📖 **Jan 5, 2026** – – – Wire cookie consent to tracking: block analytics/marketing scripts and cookies until opt-in; gate Vercel Analytics/Sentry/marketing tags based on consent.

68a. 📖 **Jan 15, 2026** – – – **REVISIT OPEN GRAPH IMAGE FOR TWITTER & LINKEDIN**: Debug why Open Graph image is not rendering on X (Twitter) and LinkedIn despite working on Facebook. Current status: Dynamic OG image route (`/api/og-image`) works and renders correctly when accessed directly, static PNG fallback (`/og-image.png`) has been added to metadata as primary image. Both platforms still not displaying preview images. Investigate: (1) Test with platform validators (X Card Validator, LinkedIn Post Inspector) after cache clears, (2) Verify image URLs are absolute and publicly accessible, (3) Check image dimensions and file size requirements for both platforms, (4) Test Content-Type headers and response formats, (5) Consider platform-specific metadata requirements or alternative approaches (e.g., static image only, different image format), (6) Review platform documentation for any recent changes to OG image requirements. Document findings and implement fix.

69. 📖 **Jan 5, 2026** – – – Publish blog post two ("How agencies scale support with Team Chat Code") and share inside relevant communities.

70. 📖 **Jan 6, 2026** – – – Produce three short Loom videos demonstrating onboarding, ingestion, and the floating chat widget for marketing drip.

71. 📖 **Jan 7, 2026** – – – Build analytics dashboards for conversations/day, top queries, and document usage trends using Supabase SQL views. **Status**: Basic metrics collected (messages, conversations, users, chatbots, documents, API calls). Need: time-series charts, period filtering, top queries analysis, document usage trends. Current placeholder charts need implementation.

72. 📖 **Jan 8, 2026** – – – **LEAD CAPTURE & CONTACT-FORM ESCALATION**: Implement hybrid lead-capture flow in commercial services chatbot. Add lightweight intent classifier to detect high-intent service inquiries (e.g., "Can I hire you?", "Do you take on projects?", "What are your rates?"). When detected, bot responds with primary CTA linking to official contact form, plus optional in-chat email capture fallback. Create `bot_leads` Supabase table (id, email, source, message_snapshot, conversation_id, created_at) with RLS policies. Validate email format, store leads, and send Slack/email notifications with email, message snapshot, and conversation ID. Ensure zero disruption to normal chatbot conversations—only trigger on high-intent messages. Compliance: store only email, no additional personal data without explicit form submission.

73. 📖 **Jan 9, 2026** – – – **REACT EMBED SDK (OPTIONAL)**: Release a React-specific embed SDK for developers who want more control and React-native integration. Create a `<TeamChatWidget />` component that wraps the universal widget or provides a React-native implementation. Include TypeScript types, React hooks for ch95. 📖 **Jan 29, 2026** – – – Implement Educational Test Taking/Training Mode feature. This feature can be marketed to schools and other institutions that need training. add dedicated test routes/API to capture test-taker credentials/consent, allow non-technical uploads (Markdown/CSV parsed to structured questions), sequence questions, auto/LLM-grade, persist scores + answers, and deliver/export results. at state management, and documentation snippets. This is an optional enhancement for React developers who prefer component-based integration over script tags. Benefits: better TypeScript support, React-native state management, component props for customization. Note: The universal widget (item 35) works perfectly in React apps via script tag, so this is primarily for developers who want a more React-idiomatic approach.

74. 📖 **Jan 10, 2026** – – – Launch a public demo bot gallery showcasing vertical use cases and link each to live chat pages.

75. 📖 **Jan 11, 2026** – – – Craft a case study template, conduct the first interview with a pilot customer, and draft a polished success story.

76. 📖 **Jan 12, 2026** – – – Ship private-mode chats that skip persistence while still streaming, warning users about ephemeral history.

77. 📖 **Jan 13, 2026** – – – Add source citation links in chat responses that jump to `canonical_url#anchor` views of the originating document.

78. 📖 **Jan 14, 2026** – – – Implement a referral program: track invites, award free-month credits, and trigger emails when referrals convert.

79. 📖 **Jan 15, 2026** – – – Run a maker discount campaign on Indie Hackers/Product Hunt, highlighting the Founders Plan scarcity.

80. 📖 **Jan 16, 2026** – – – Release a WordPress plugin that renders the widget via shortcode, validates domains, and provides install docs.

81. 📖 **Jan 17, 2026** – – – Polish dashboard UI with dark mode, improved empty states, and skeleton loaders to smooth perceived performance.

82. 📖 **Jan 18, 2026** – – – Stand up a support inbox and in-app help center containing onboarding FAQs, billing help, and security assurances.

83. 📖 **Jan 19, 2026** – – – Publish blog post three ("RAG security checklist for internal AI assistants") tying product features to compliance wins.

84. 📖 **Jan 20, 2026** – – – Launch a $300 LinkedIn ad experiment targeting customer success managers, and monitor CPC-to-signup conversion.

85. 📖 **Jan 21, 2026** – – – Capture two concise case studies, finalize copy, and feature them on the landing page and email sequences.

86. 📖 **Jan 22, 2026** – – – Add Stripe usage metrics (embedding count, chat volume) to invoices and make them downloadable in the dashboard.

87. 📖 **Jan 23, 2026** – – – Expand analytics with team-level tabs summarizing per-bot activity, logs, top docs accessed, and satisfaction polls. **Status**: Team filtering added. Need: per-bot performance metrics, satisfaction feedback collection system, top documents accessed tracking, activity feed from audit logs.

88. 📖 **Jan 24, 2026** – – – Outline the Shopify plugin architecture, identify ScriptTag hurdles, and create initial backlog stories.

89. 📖 **Jan 25, 2026** – – – Conduct a security review: run dependency updates, automated scans, and rehearse incident response steps.

90. 📖 **Jan 26, 2026** – – – Schedule and document a backup/restore drill, capturing action items to improve recovery objectives.

91. 📖 **Jan 27, 2026** – – – Email existing users about the referral program, highlight rewards, and set up metrics tracking in analytics.

92. 📖 **Jan 28, 2026** – – – **FULL SITE CRAWLER WITH LINK TREE APPROVAL**: Build multi-page crawler with interactive link tree discovery and user approval workflow. This extends the single-page import (item #41) to support importing entire documentation sites. Implementation: (1) **DISCOVERY PHASE**: Create `/api/documents/discover-urls` endpoint that takes a base URL (e.g., `https://site.com/docs`), recursively crawls links up to configurable depth (default 3 levels), filters links by URL pattern (e.g., only `/docs/*`), builds hierarchical tree structure with page titles and descriptions, and returns tree without scraping content yet. Handle rate limiting (delays between requests), respect `robots.txt`, track visited URLs to prevent loops, set timeouts for slow pages. (2) **PREVIEW & APPROVAL PHASE**: Build React component (`UrlCrawlerTree`) that displays discovered links in expandable tree view with checkboxes, shows page titles/descriptions, displays count of selected pages and quota impact ("Will create 45 documents"), includes "Select All" / "Deselect All" buttons, provides search/filter within tree, and allows users to preview before processing. (3) **PROCESSING PHASE**: After user approval, process selected URLs in background jobs with progress tracking ("Importing 12/45..."), create documents one by one using existing ingestion pipeline, handle failures gracefully (continue on errors, show summary), and display completion summary. (4) **ENHANCEMENTS**: Add sitemap support (parse `sitemap.xml` for faster, more reliable discovery), implement incremental delta detection (compare content hashes to detect changes on re-crawl), add error reporting dashboard for failed pages, support JavaScript-rendered sites using headless browser (Puppeteer/Playwright) for SPAs. Benefits: User control and transparency (users see exactly what will be imported), cost awareness (quota impact visible before processing), quality control (exclude irrelevant pages), better UX than blind crawling. This feature should be gated behind Pro+ plans (item #58). Estimated time: 2-3 weeks for full implementation.

93. 📖 **Jan 30, 2026** – – – **CENTRALIZE INTERNAL REQUEST AUTH**: Remove UI-driven `isInternal` toggles as the source of truth. In `/api/chat`, derive internal vs external access from the authenticated session and verified team membership of the bot (owner or team member), and only allow public/unauthenticated access for public bots or valid API keys. Update dashboard/test chat clients to omit `isInternal` and rely on the server for authorization. Add regression tests for: (1) team member testing a team bot in dashboard, (2) non-member access blocked, (3) public bot access still works, (4) API key access works.

any document that is associated with a url should save the url. that way that document can be updated in future automatically, or manually by tapping a button.

93. 📖 **Jan 29, 2026** – – – Implement Educational Test Taking/Training Mode feature. This feature can be marketed to schools and other institutions that need training. add dedicated test routes/API to capture test-taker credentials/consent, allow non-technical uploads (Markdown/CSV parsed to structured questions), sequence questions, auto/LLM-grade, persist scores + answers, and deliver/export results.

94. 📖 **Jan 30, 2026** – – – Organize or sponsor a local AI meetup, prepare a live demo script, and collect attendee emails for follow-up.

95. 📖 **Jan 31, 2026** – – – Embed our own widget as in-app support chat, scripted to escalate to email when a human handoff is required.

96. 📖 **Feb 1, 2026** – – – Produce a webinar deck ("Building secure document-aware AI bots"), schedule the first session, and promote it.

96a. 📖 **Feb 1, 2026** – – – **WhatsApp integration**: Set up WhatsApp Business Platform (Cloud API) support with webhook verification, number registration, message routing, and template handling; document business verification steps.

97. 📖 **Feb 2, 2026** – – – **Next.js architecture refactor**: Centralize Supabase data access into server-only repos/services with consistent error/return shapes and app-level auth checks, roll out schema-first validation (Zod) shared by forms, server actions, and API routes, add route-level `error.tsx`/empty/permission states where missing, and document cache/revalidation strategy (static vs dynamic, tags, user-specific). Start with one vertical (bots/documents) to de-risk, then expand. Check this document for more information: docs/architectural-patterns.md

98. 📖 **Feb 3, 2026** – – – Add scheduled analytics rollups (cron endpoint + secret) once enough data accumulates; switch charts to `analytics_daily_rollups`.

99. 📖 **Feb 3, 2026** – – – Start cold outreach to SaaS support leads with tailored pain-point messaging and invite them to webinar demos.

100.  📖 **Feb 4, 2026** – – – Add monthly invoice exports with line items for usage, plan fees, and tax fields to support finance teams.

101.  📖 **Feb 5, 2026** – – – Kick off SOC 2 readiness checklist tasks, assigning owners and aligning backlog to upcoming compliance requirements.

102.  📖 **Feb 6, 2026** – – – Expand marketing site with industry-specific pages (Support Teams, HR, Agencies) and targeted CTAs.

103.  📖 **Feb 7, 2026** – – – Establish a weekly content cadence—publish one blog and one video—and queue topics for the next month.

104.  📖 **Feb 8, 2026** – – – Evaluate paid channel performance, adjust spend allocation, and document learning for scale decisions.

105.  📖 **Jan 3, 2026** – – – Review MDX compiler strategy (mdxRs vs JS) and confirm production readiness for documentation tables.

106.  📖 **Feb 9, 2026** – – – Review KPIs against roadmap targets (paying teams, MRR, activation, churn) and define corrective experiments.

107.  📖 **Feb 10, 2026** – – – Host an internal retrospective covering the full 90-day sprint, celebrate wins, and update the roadmap toward $10k MRR.

108.  📖 **Feb 11, 2025** – – – Set up a community hub when ready (Discourse or equivalent). Define categories (Q&A, feedback, announcements), moderation guidelines, and onboarding flow. Link from docs once live. re-add the commented out community link here: src/app/docs/docs-page-client.tsx

109.  📖 **Feb 12, 2026** – – – Complete a full review of the app/www split (routing, auth, redirects, nav, and SEO) and document any follow-up fixes. See routes src/app/(app) and src/app/(site)
