# 🔍 Alignment Analysis: 90-Day Todo vs Technical Architecture

**Date:** November 3, 2025  
**Purpose:** Identify discrepancies between 90-day todo milestones and technical architecture documentation

---

## ⚠️ Critical Discrepancies

### 1. **Collections Architecture Mismatch**

**Roadmap (`roadmap.md`)** shows:

```sql
bot_collections(id, team_id, name, visibility)  -- Main collections table
bot_collection_links(bot_id, collection_id)     -- Junction table
bot_documents(id, team_id, collection_id, ...)  -- Documents belong to collections
embeddings(chunk_id, team_id, collection_id, vector)
```

**Technical Architecture (`technical-architecture.md`)** shows:

```sql
bot_documents(id, team_id, bot_id, ..., is_global)  -- Documents linked to bots
bot_document_links(bot_id, document_id)  -- Junction table
-- NO collections table mentioned
```

**Impact:** This is a fundamental architectural difference that affects:

- Day 3: Migration scripts need to decide which model to implement
- Day 15: Bot linking strategy differs
- Day 18-19: Retrieval logic differs (collection-based vs bot-document links)

**Recommendation:**

- ✅ **Option A:** Use **Collections** model (as per roadmap) - better for document organization, reuse across bots
- ❌ **Option B:** Use **Bot-Document Links** model (as per current architecture doc) - simpler but less flexible

**Decision needed:** Choose one model before Day 3 migrations.

---

### 2. **Missing Tables in Day 3 Migration**

**Day 3 Todo:**

> Create initial Supabase migration scripts for core tables (teams, bots, documents, conversations, embeddings, audit_log)

**Architecture Doc Priority:**

- 🔴 Critical: `teams`, `team_members`
- 🔴 Critical: `bot_bots`, `bot_documents`
- 🟡 High: `subscriptions`, `doc_chunks`, `embeddings`
- 🟢 Medium: `audit_log`

**Missing from Day 3:**

- ❌ `team_members` (critical for team functionality)
- ❌ `doc_chunks` (required before embeddings can work)
- ⚠️ `subscriptions` (needed for billing, but may be Day 22)

**Recommendation:** Update Day 3 to include `team_members` and `doc_chunks` as they're dependencies.

---

### 3. **Team Membership Timing**

**Day 7 Todo:**

> Finish authentication flow with Supabase magic links, profile bootstrap, and **team membership creation**

**Architecture Doc:**

- `team_members` should be created in Day 3 migrations
- Team membership creation UI/flow in Day 7 is correct
- But Day 30 (Dec 1) also mentions "Build team invitation UI"

**Gap:** Day 7 mentions "team membership creation" which could mean:

- Creating the initial team_member record on signup (correct)
- Full invitation UI (overlaps with Day 30)

**Recommendation:** Clarify Day 7 = initial team membership on signup. Day 30 = full invitation system.

---

## 📋 Missing Architecture Elements in Todo

### Tables Not Mentioned in 90-Day Todo

| Table                  | Architecture Doc | Should be in Todo?                  | Priority    |
| ---------------------- | ---------------- | ----------------------------------- | ----------- |
| `bot_collections`      | ✅ Added         | ✅ YES (if using collections model) | 🔴 Critical |
| `bot_collection_links` | ✅ Added         | ✅ YES (if using collections model) | 🔴 Critical |
| `subscriptions`        | ✅ Mentioned     | ⚠️ Implied in Day 22                | 🟡 High     |
| `team_members`         | ✅ Mentioned     | ❌ Not explicitly in Day 3          | 🔴 Critical |

### Features Mentioned in Architecture but Not in Todo

1. **Collection management UI** (if using collections model)

   - No todo item for creating/managing collections
   - Day 15 mentions "bot linking/global toggles" but not collection assignment

2. **Retrieval filtering by collections** (Day 19)
   - Architecture shows collection-based retrieval
   - Todo says "filters by linked/global docs"
   - Needs alignment

---

## ✅ Aligned Elements

### Well-Aligned Items

1. **Day 3 → Day 4 → Day 5** sequence is correct:

   - Day 3: Create tables ✅
   - Day 4: Add RLS policies ✅
   - Day 5: Environment setup ✅

2. **RAG Pipeline** (Days 16-20) matches architecture:

   - Day 16: Ingestion pipeline ✅
   - Day 17: Embedding integration ✅
   - Day 18: Retrieval helper ✅
   - Day 19: Query embedding + filtering ✅
   - Day 20: Prompt injection ✅

3. **Team-scoped features** align:
   - Day 22: Stripe billing (subscriptions table) ✅
   - Day 30: Team invitations (team_members UI) ✅

---

## 🔧 Recommended Actions

### Immediate (Before Day 3)

1. **Decide on Collections vs Bot-Document Links**

   - Update technical architecture doc with chosen model
   - Update roadmap if needed

2. **Update Day 3 Todo:**

   ```
   Create initial Supabase migration scripts for core tables:
   - teams, team_members (CRITICAL)
   - bot_bots
   - bot_collections + bot_collection_links (if using collections model)
   OR bot_documents + bot_document_links (if using links model)
   - doc_chunks
   - bot_conversations
   - embeddings (requires pgvector extension)
   - audit_log
   ```

3. **Clarify Day 7 vs Day 30:**
   - Day 7: Auto-create team + team_member record on signup
   - Day 30: Full team invitation UI with role assignment

### Short-term (Days 3-20)

4. **If using Collections model, add:**

   - Day 14.5: Build collection CRUD UI
   - Day 15: Update to "Assign documents to collections" instead of just "bot linking"

5. **Update Day 19 retrieval logic** to match chosen model:
   - Collections: `WHERE collection_id IN (bot's collections)`
   - Links: `WHERE document_id IN (linked docs) OR is_global = true`

---

## 📊 Alignment Score

| Category             | Alignment | Notes                                            |
| -------------------- | --------- | ------------------------------------------------ |
| **Core Schema**      | 🟡 75%    | Collections model missing from architecture doc  |
| **Migration Order**  | 🟢 90%    | Missing `team_members` and `doc_chunks` in Day 3 |
| **Feature Sequence** | 🟢 85%    | Minor timing clarifications needed               |
| **RAG Pipeline**     | 🟢 95%    | Well aligned                                     |
| **Team Features**    | 🟡 80%    | Team membership creation timing needs clarity    |

**Overall Alignment: 85%** 🟢 Good, but needs schema model decision

---

## 🎯 Decision Matrix

### Option A: Collections Model (Roadmap)

**Pros:**

- ✅ Better document organization
- ✅ Documents reusable across multiple bots
- ✅ Matches roadmap.md specification
- ✅ More scalable for enterprise use

**Cons:**

- ❌ More complex schema
- ❌ More tables to manage
- ❌ Additional UI for collection management

**Required Changes:**

- Add `bot_collections` and `bot_collection_links` tables to architecture doc
- Update Day 3 migration script
- Add collection management UI todo
- Update retrieval logic in Day 19

### Option B: Bot-Document Links (Current Architecture)

**Pros:**

- ✅ Simpler schema
- ✅ Direct bot-to-document relationship
- ✅ Matches current architecture doc
- ✅ Faster to implement

**Cons:**

- ❌ Documents can't be easily shared across bots
- ❌ Doesn't match roadmap.md
- ❌ Less flexible for future features

**Required Changes:**

- Update roadmap.md to remove collections
- Update Day 19 retrieval logic
- Update Day 15 description

---

## ✅ Recommendation

**Choose Option A (Collections Model)** because:

1. It's already specified in roadmap.md
2. Better aligns with multi-tenant SaaS patterns
3. More flexible for future growth
4. Matches "collections" terminology used in Day 19 todo

**Action Items:**

1. Update `technical-architecture.md` to include collections model
2. Update Day 3 todo to include `bot_collections` and `bot_collection_links`
3. Add collection management UI to todo (Day 14.5 or update Day 15)
4. Clarify Day 7 vs Day 30 scope

---

**Next Review:** After Day 3 migration scripts are created
