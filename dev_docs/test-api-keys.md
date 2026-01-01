# API Key Testing Guide

## Quick Test Checklist

After creating an API key, test the following:

### ✅ 1. API Key Authentication (Critical)

**Test:** Use a valid API key to make a chat request

**Command:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "bot_slug": "YOUR_BOT_SLUG"}'
```

**Expected:**
- ✅ HTTP 200 status
- ✅ Returns chat response with `response` field
- ✅ No "Invalid API key" error

**Or use the test script:**
```bash
./scripts/test-api-key.sh YOUR_API_KEY YOUR_BOT_SLUG
```

---

### ✅ 2. Invalid Key Rejection

**Test:** Try to use a fake/invalid API key

**Command:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer sk_live_invalid_REDACTED" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "bot_slug": "YOUR_BOT_SLUG"}'
```

**Expected:**
- ✅ HTTP 500 status (or 401)
- ✅ Error message: "Invalid API key"

---

### ✅ 3. Rate Limit Sharing (Team-Based)

**Test:** Create 2 API keys for bots in the same team, use both, verify they share rate limits

**Steps:**
1. Create API Key A for Bot 1
2. Create API Key B for Bot 2 (same team)
3. Make 3 requests with Key A (if free plan limit is 3)
4. Make 1 request with Key B

**Expected:**
- ✅ First 3 requests with Key A succeed
- ✅ 4th request with Key B should fail with rate limit error (HTTP 429)
- ✅ Both keys share the same rate limit pool (team-based)

**Command for Key A:**
```bash
# Make 3 requests
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/chat \
    -H "Authorization: Bearer KEY_A" \
    -H "Content-Type: application/json" \
    -d '{"message": "Test '$i'", "bot_slug": "BOT_1"}'
  echo ""
done
```

**Command for Key B (should fail on 4th request):**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer KEY_B" \
  -H "Content-Type: application/json" \
  -d '{"message": "Test 4", "bot_slug": "BOT_2"}'
```

---

### ✅ 4. Deleted Key Rejection

**Test:** Delete an API key, then try to use it

**Steps:**
1. Create an API key
2. Copy the key
3. Delete the key via UI
4. Try to use the deleted key

**Expected:**
- ✅ HTTP 500 status
- ✅ Error: "Invalid API key"
- ✅ Key is marked as `active: false` in database

---

### ✅ 5. Key Masking (UI)

**Test:** Verify keys are properly masked in the UI

**Check:**
- ✅ After creating a key, you see the full key once
- ✅ After refreshing/closing dialog, keys are masked as `sk_live_****abcd`
- ✅ Copy button copies the masked version (not the real key)
- ✅ You cannot see the full key again after creation

---

### ✅ 6. Database Verification

**Test:** Verify keys are stored as hashes in the database

**Check in Supabase:**
```sql
SELECT id, label, key, created_at, active 
FROM bot_api_keys 
WHERE user_id = 'YOUR_USER_ID';
```

**Expected:**
- ✅ `key` column contains bcrypt hash (starts with `$2a$` or `$2b$`)
- ✅ No plain text keys visible
- ✅ Hash length is ~60 characters

---

### ✅ 7. Audit Logging

**Test:** Verify create/delete operations are logged

**Check in Supabase:**
```sql
SELECT action, resource_type, resource_id, metadata, created_at
FROM bot_audit_log
WHERE resource_type = 'api_key'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
- ✅ `api_key_created` entries with metadata (bot_id, bot_slug, label)
- ✅ `api_key_deleted` entries with metadata
- ✅ All entries have `team_id` and `user_id`

---

## Performance Note

The current implementation fetches all active API keys and compares hashes. This is secure but could be slow with many keys. For MVP, this is acceptable. Monitor API response times if you have 100+ keys per team.

---

## Troubleshooting

**Issue:** "Invalid API key" even with valid key
- ✅ Check: Key was copied correctly (no extra spaces)
- ✅ Check: Authorization header format: `Bearer sk_live_...`
- ✅ Check: Key is active in database: `SELECT active FROM bot_api_keys WHERE ...`

**Issue:** Rate limit not working
- ✅ Check: Rate limits are tracked by `team_id` now (not per key)
- ✅ Check: Team's plan in `bot_teams` table
- ✅ Check: `bot_rate_limits` table has entries for today

**Issue:** Key not found during hash comparison
- ✅ Check: All keys are active: `SELECT COUNT(*) FROM bot_api_keys WHERE active = true`
- ✅ Check: Key hasn't been deleted (soft delete sets `active = false`)

