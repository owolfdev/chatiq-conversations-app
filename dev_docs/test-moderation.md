# Testing Moderation Middleware

This guide covers how to test the OpenAI moderation middleware implementation.

## Quick Test Checklist

> ⚠️ The `/api/chat` endpoint now streams responses by default (SSE). When you
> need a single JSON payload—for example, in curl scripts or automated tests—add
> `"stream": false` to the request body as shown below. This keeps the endpoint
> compatible with existing tooling while the UI enjoys streaming updates.

### ✅ 1. Basic Moderation Test

**Test:** Send a clean message that should pass moderation

**Command:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?", "bot_slug": "default-app-bot", "stream": false}'
```

**Expected:**
- ✅ HTTP 200 status
- ✅ Returns chat response
- ✅ No moderation error

---

### ✅ 2. Flagged Content Test

**Test:** Send content that should be flagged by moderation

**Command:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message with inappropriate content", "bot_slug": "default-app-bot", "stream": false}'
```

**Note:** OpenAI's moderation API uses ML models, so you may need to use actual flagged content to test. See "Test Content Examples" below.

**Expected:**
- ✅ HTTP 422 status (Unprocessable Entity)
- ✅ Standardized error response:
  ```json
  {
    "error": {
      "code": "MODERATION_FLAGGED",
      "message": "Your message was flagged by our content moderation system...",
      "details": {
        "flaggedCategories": ["hate", "violence"]
      }
    }
  }
  ```
- ✅ No response sent to OpenAI
- ✅ Flag logged to `bot_audit_log` table

---

### ✅ 3. Audit Log Verification

**Test:** Verify that flagged content is logged

**SQL Query:**
```sql
SELECT 
  id,
  team_id,
  user_id,
  action,
  resource_type,
  metadata->>'flagged_categories' as flagged_categories,
  metadata->>'message_preview' as message_preview,
  ip_address,
  created_at
FROM bot_audit_log
WHERE action = 'content_moderation_flagged'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:**
- ✅ Recent flagged content appears in audit log
- ✅ Contains flagged categories, message preview, IP address
- ✅ Has team_id and user_id (if available)

---

### ✅ 4. Standardized Error Format Test

**Test:** Verify all error types use standardized format

**Test different error scenarios:**

```bash
# Invalid bot slug
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "bot_slug": "non-existent-bot", "stream": false}'

# Missing message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"bot_slug": "default-app-bot", "stream": false}'

# Rate limit (if you hit it)
# ... make many requests quickly
```

**Expected:**
- ✅ All errors follow format: `{ error: { code, message, details? } }`
- ✅ Appropriate HTTP status codes (404, 400, 429, 422, etc.)

---

### ✅ 5. API Key Request Moderation

**Test:** Test moderation with API key authentication

**Command:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message", "bot_slug": "your-bot-slug", "stream": false}'
```

**Expected:**
- ✅ Moderation works with API keys
- ✅ Flagged content still logged (even without user session)
- ✅ Standardized error responses

---

## Using the Test Script

We provide a test script to automate basic tests:

```bash
# Make script executable
chmod +x scripts/test-moderation.sh

# Run with default bot slug
./scripts/test-moderation.sh

# Run with custom bot slug
./scripts/test-moderation.sh my-bot-slug

# Run with API key
./scripts/test-moderation.sh my-bot-slug sk_live_abc123...
```

---

## Test Content Examples

⚠️ **Warning:** Only use these for testing in development environments.

### Known Flagged Content (for testing)

These are examples that often trigger moderation flags:

**Hate Speech:**
- Content containing racial slurs
- Discriminatory language

**Violence:**
- Graphic descriptions of violence
- Threats of harm

**Sexual Content:**
- Explicit sexual language
- Inappropriate sexual references

**Self-Harm:**
- Instructions for self-harm
- Suicide-related content

**Note:** OpenAI's moderation is probabilistic, so not all variations will trigger flags. Use these as guidelines, not guarantees.

---

## Manual Testing via UI

### 1. Test in Chat Interface

1. Navigate to a chat page (e.g., `/chat/default-app-bot`)
2. Type a clean message → should work
3. Type potentially flagged content → should show error message
4. Check browser console for error details

### 2. Test Error Display

1. Send flagged content
2. Verify error message appears in UI
3. Check that error message is user-friendly (not technical)

---

## Verifying Logging

### Check Audit Logs in Supabase

1. Go to Supabase Dashboard → SQL Editor
2. Run:
   ```sql
   SELECT 
     *,
     metadata->>'flagged_categories' as categories,
     metadata->>'message_preview' as preview
   FROM bot_audit_log
   WHERE action = 'content_moderation_flagged'
   ORDER BY created_at DESC
   LIMIT 20;
   ```

3. Verify:
   - ✅ Flagged categories are logged
   - ✅ Message preview (first 200 chars) is stored
   - ✅ IP address and user agent are captured
   - ✅ Team ID and Bot ID are associated

### Check Console Logs

When content is flagged, you should see:
```
🚩 Moderation flag logged: hate, violence
```

---

## Testing Error Responses

### Standardized Error Format

All errors should follow this format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Optional additional context
    }
  }
}
```

### Error Codes

- `MODERATION_FLAGGED` - Content was flagged by moderation (422)
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded (429)
- `BOT_NOT_FOUND` - Bot not found (404)
- `INVALID_API_KEY` - Invalid API key (401)
- `OPENAI_API_ERROR` - OpenAI API error (502)
- `MODERATION_API_ERROR` - Moderation API error (502)
- `INTERNAL_SERVER_ERROR` - Generic server error (500)

---

## Edge Cases to Test

### 1. Empty Message
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "", "bot_slug": "default-app-bot"}'
```
**Expected:** Validation error, not moderation error

### 2. Very Long Message
```bash
# Generate a long message
LONG_MSG=$(python3 -c "print('A' * 10000)")
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"$LONG_MSG\", \"bot_slug\": \"default-app-bot\"}"
```
**Expected:** Should still be moderated (or hit other limits first)

### 3. Special Characters
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test with émojis 🚀 and spéci@l chars!", "bot_slug": "default-app-bot"}'
```
**Expected:** Should handle Unicode correctly

### 4. Moderation API Failure

If the moderation API fails, the system is configured to "fail open" (allow content through) to prevent service disruption. In production, you might want to configure this differently.

To test this scenario, you could temporarily break the OpenAI API key or network connection.

---

## Integration Testing

### Test Full Flow

1. **User sends flagged message** → Moderation checks → Flags content
2. **Error returned** → Standardized format → Logged to audit log
3. **User receives error** → User-friendly message displayed
4. **Admin reviews log** → Can see flagged content in audit log

### Verify No OpenAI Call

When content is flagged, verify that:
- ✅ No request is made to OpenAI chat/completions endpoint
- ✅ No tokens are consumed
- ✅ No response is generated

You can verify this by:
1. Checking network logs
2. Checking OpenAI usage dashboard
3. Looking at application logs

---

## Production Testing Checklist

Before deploying to production:

- [ ] Test with real-world content samples
- [ ] Verify audit logs are being written correctly
- [ ] Check error responses are user-friendly
- [ ] Test with API keys (not just UI)
- [ ] Verify logging includes all required fields
- [ ] Test rate limiting + moderation together
- [ ] Verify moderation doesn't break normal chat flow
- [ ] Check that flagged categories are being logged accurately
- [ ] Test error handling when moderation API is down
- [ ] Verify no sensitive data leaks in error messages

---

## Troubleshooting

### Moderation Not Working

1. **Check environment variables:**
   ```bash
   echo $OPENAI_API_KEY
   ```
   Should start with `sk-`

2. **Check API route logs:**
   Look for errors in server logs

3. **Verify moderation is being called:**
   Add console logs in `moderateContent` function

### Logs Not Appearing

1. **Check Supabase connection:**
   Verify `SUPABASE_SERVICE_ROLE_KEY` is set

2. **Check RLS policies:**
   Audit logs use admin client, so RLS shouldn't block, but verify

3. **Check database permissions:**
   Service role key should have insert permissions on `bot_audit_log`

### Errors Not Standardized

1. **Verify error-to-response conversion:**
   Check `errorToResponse` function is being called

2. **Check error types:**
   ModerationError should have `code: "MODERATION_FLAGGED"`

3. **Verify API route:**
   Make sure route.ts uses `errorToResponse`

---

## Next Steps

After testing moderation:

1. **Set up monitoring:** Create alerts for high rates of flagged content
2. **Review audit logs:** Periodically review flagged content patterns
3. **Adjust thresholds:** If needed, adjust moderation sensitivity (future enhancement)
4. **User feedback:** Collect feedback on false positives/negatives



