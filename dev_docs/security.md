Excellent — this is the right time to formalize your **Security Specification**.
What follows is a concise, production-ready spec for **Team Chat Code** — phrased so you can publish it internally or externally (in docs, onboarding, or your investor deck).

---

# 🛡️ **Team Chat Code — Security Specification (v1.0)**

## **1. Overview**

Team Chat Code is a multi-tenant SaaS platform that allows teams to build AI-powered chatbots using their own documents.
Security is foundational to both our infrastructure and our product design.
This document defines how we protect customer data, application integrity, and model interactions.

---

## **2. Objectives**

- **Confidentiality:** Customer data is accessible only to authorized team members.
- **Integrity:** Stored and processed data cannot be tampered with or mixed between tenants.
- **Availability:** Services remain resilient under normal load and attacks.
- **Compliance & Trust:** Operations conform to modern data-protection expectations (GDPR/PDPA/SOC 2 principles).

---

## **3. Architecture Security**

### **3.1 Multi-Tenancy Isolation**

- Each record carries a `team_id`; **Row Level Security (RLS)** in Supabase strictly enforces tenant isolation.
- Bots, documents, and embeddings inherit `team_id`; cross-team access is impossible by query design.
- Every API call resolves user → profile → team context server-side (never from the client).

### **3.2 Data Encryption**

- **In transit:** TLS 1.2+ enforced for all HTTP and database connections.
- **At rest:** AES-256 server-side encryption (Supabase Postgres + Storage).
- Access tokens, API keys, and refresh tokens are encrypted using libsodium before storage.

### **3.3 Secrets Management**

- Secrets and API keys are stored only in **Vercel/Supabase environment variables**.
- No secrets committed to the repository.
- Rotation performed quarterly or upon staff change.

---

## **4. Data Handling**

### **4.1 Document Ingestion**

- Accepted formats: `.pdf`, `.docx`, `.md`, `.txt`, `.html`.
- File-type whitelist; binaries/executables rejected.
- Text extracted server-side, sanitized, and scanned with the **OpenAI Moderation API** for illegal or policy-violating content.
- Optional regex filtering for PII (emails, card numbers, SSNs).
- Flagged files are quarantined (`is_flagged = true`) and excluded from embedding.

### **4.2 Storage & Embeddings**

- Original files stored in Supabase Storage with path prefix `/teams/{team_id}/docs/{uuid}`.
- Embeddings stored in Postgres pgvector, partitioned by `team_id` and `collection_id`.
- Vectors contain no secrets or personal data — only semantic representations.

### **4.3 Data Retention**

- Customer content retained while subscription is active.
- Deleted documents and embeddings are hard-deleted within **30 days**.
- Audit logs retained 90 days for security analysis.

---

## **5. Application Security**

### **5.1 Authentication & Access Control**

- Supabase Auth (email + magic link or OAuth) for identity.
- JWT tokens validated on every request; short-lived access, refresh rotation.
- Admin actions protected by server actions with re-authentication.
- Bot visibility flags: `private` (team-only) or `public` (read-only shared).

### **5.2 API & Rate Limiting**

- Global rate limiter per team and per IP.
- Exponential back-off + suspension on abuse.
- API keys scoped to `team_id`; stored hashed with bcrypt.

### **5.3 Audit & Monitoring**

- All create/update/delete actions logged to `audit_log` (team_id, user_id, timestamp, action).
- Error and access logs streamed to secure logging service (e.g., Vercel Logs + Supabase Logs).
- Suspicious patterns (excessive upload or embedding) trigger alerts.

---

## **6. AI & Prompt Security**

### **6.1 Moderation**

- User prompts and uploaded text screened via **OpenAI Moderation API** before model invocation.
- Flagged or disallowed content returns a polite error message; not forwarded to LLM.

### **6.2 Ephemeral Context**

- Retrieved chunks and prompts are sent to the model only for that request; they are **not persisted** or used for training.
- Conversations stored only in `bot_messages` under the owning team.

### **6.3 Model Providers**

- Only vetted, reputable APIs (OpenAI, Anthropic) used over TLS endpoints.
- No third-party relay proxies.

---

## **7. Infrastructure Security**

- Hosted on **Vercel (frontend/API)** and **Supabase (database/storage)** — both SOC 2 Type II certified.
- Weekly dependency updates and vulnerability scans via GitHub Dependabot.
- Strict Content Security Policy (CSP) headers; XSS and CSRF protection enabled.
- Backups encrypted and tested weekly.

---

## **8. Compliance & Legal**

- GDPR/PDPA-aligned data handling (right to access, delete, export).
- Clear Terms of Service prohibiting illegal, copyrighted, or sensitive personal data.
- Automatic screening for illegal content; immediate removal if detected.
- Data Processing Addendum (DPA) available for enterprise customers.

---

## **9. Incident Response**

- Dedicated incident channel monitored 24/7.
- Detection → triage → containment → customer notification (within 72 hours max).
- Post-mortems documented; mitigation tasks tracked to closure.

---

## **10. Roadmap (Security v2)**

- SOC 2 readiness assessment (Q3 2025).
- End-to-end encryption for document previews.
- Optional customer-supplied encryption keys (BYOK).
- Real-time anomaly detection on document uploads.

---

### **Summary Tagline (for marketing use)**

> “Team Chat Code keeps every team’s knowledge private by default.
> Tenant-level isolation, encrypted storage, AI moderation, and strict RLS make your data as secure as your own servers — without the setup headache.”

---

## **11. Row Level Security (RLS) Policy Rationale**

This appendix documents the RLS policies implemented for each table, explaining the security rationale behind each policy.

### **11.1 Helper Functions**

RLS policies use helper functions for performance and consistency:

- **`is_team_member(team_uuid)`**: Checks if authenticated user is a member of a team
- **`user_team_ids()`**: Returns all team IDs where user is a member (for filtering)
- **`is_team_admin(team_uuid)`**: Checks if user has owner/admin role
- **`is_team_owner(team_uuid)`**: Checks if user is team owner

These functions use `SECURITY DEFINER` to ensure consistent access checks and improve query performance.

### **11.2 Core Tenant Tables**

#### **bot_teams**
- **SELECT**: Users can only see teams they are members of
- **INSERT**: Any authenticated user can create a team (becomes owner automatically)
- **UPDATE/DELETE**: Only team owners can modify or delete teams
- **Rationale**: Teams are the root isolation boundary. Owners have full control.

#### **bot_team_members**
- **SELECT**: Users can see memberships for teams they belong to
- **INSERT**: Only owners/admins can add members (prevents unauthorized team expansion)
- **UPDATE**: Owners can change any role; admins can only change roles to 'member' (prevents privilege escalation)
- **DELETE**: Only owners can remove members
- **Rationale**: Prevents privilege escalation and unauthorized team access.

#### **bot_bots**
- **SELECT**: Users see bots from their teams OR public bots (read-only access to public bots)
- **INSERT/UPDATE/DELETE**: Only team members can manage bots in their teams
- **Rationale**: Public bots enable sharing while maintaining team isolation for ownership.

#### **bot_documents**
- **SELECT/INSERT/UPDATE/DELETE**: All operations restricted to team members
- **Rationale**: Documents are team-scoped resources. No cross-team access.

#### **bot_conversations**
- **SELECT/INSERT/UPDATE/DELETE**: All operations restricted to team members
- **Rationale**: Conversations are team-scoped. Users can only access conversations from bots in their teams.

### **11.3 Collections and Embeddings**

#### **bot_collections**
- **SELECT/INSERT/UPDATE/DELETE**: All operations restricted to team members
- **Rationale**: Collections organize documents within teams. No cross-team access.

#### **bot_collection_links**
- **SELECT**: Users see links for bots/collections in their teams
- **INSERT/DELETE**: Users can manage links for bots in their teams
- **Rationale**: Links are derived from team-scoped bots and collections.

#### **bot_doc_chunks**
- **SELECT/INSERT/UPDATE/DELETE**: All operations restricted to team members
- **Rationale**: Chunks are team-scoped. Required for RAG queries within team boundaries.

#### **bot_embeddings**
- **SELECT/INSERT/UPDATE/DELETE**: All operations restricted to team members
- **Rationale**: Embeddings are team-scoped. Vector searches must respect team boundaries.

### **11.4 API Keys and Logs**

#### **bot_api_keys**
- **SELECT/INSERT/UPDATE/DELETE**: All operations restricted to team members
- **Rationale**: API keys are team-scoped. Keys can only be managed by team members.

#### **bot_logs**
- **SELECT/INSERT/UPDATE**: Team members can access logs from their teams
- **DELETE**: Only team admins can delete logs (preserves audit trail)
- **Rationale**: Logs are team-scoped. Admins can clean up logs for privacy/compliance.

#### **bot_user_activity_logs**
- **SELECT/INSERT**: Users see their own logs or team logs
- **UPDATE**: Users can only update their own logs
- **Rationale**: Activity logs are user-scoped with optional team context.

#### **bot_audit_log**
- **SELECT**: Users see audit logs from their teams (or global logs if team_id is NULL)
- **INSERT**: Users can create audit logs for their teams
- **UPDATE**: Not allowed (audit logs are immutable)
- **DELETE**: Only team admins can delete audit logs (for compliance/privacy)
- **Rationale**: Audit logs must be immutable for security compliance. Admin deletion allowed for GDPR/privacy requirements.

### **11.5 Messages and Public Tables**

#### **bot_messages**
- **SELECT/INSERT/UPDATE/DELETE**: All operations restricted to team members
- **Team context derived from**: `conversation_id → bot_id → team_id`
- **Rationale**: Messages inherit team context from conversations. No direct team_id needed.

#### **bot_user_profiles**
- **SELECT/UPDATE**: Users can only see/update their own profile
- **Rationale**: Privacy protection. Users cannot view or modify other users' profiles.

### **11.6 Tables Without RLS**

The following tables do not have RLS enabled (access controlled via application logic):

- **bot_contact_messages**: Public contact form, accessible to unauthenticated users
- **bot_rate_limits**: System-managed, access controlled via application logic
- **bot_document_links**: Legacy table (new system uses bot_collection_links)

### **11.7 Policy Testing Guidelines**

When testing RLS policies:

1. **Test as different users**: Create test users in different teams
2. **Verify isolation**: Ensure users cannot access data from other teams
3. **Test role-based access**: Verify owner/admin/member permissions
4. **Test public resources**: Verify public bots are accessible to all authenticated users
5. **Test edge cases**: Orphaned records, deleted teams, etc.

### **11.8 Performance Considerations**

- RLS policies use indexed `team_id` columns for performance
- Helper functions use `STABLE` marking for query optimization
- Policies avoid complex subqueries where possible
- Indexes on `team_id` and `bot_team_members(user_id, team_id)` are critical

---

Would you like me to produce **a public-facing summary** (one-page marketing version for your landing site) that turns this into simple, trust-building copy?
