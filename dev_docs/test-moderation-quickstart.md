# Quick Start: Testing Moderation

## 🚀 Fastest Way to Test

### Step 1: Start the Dev Server
```bash
npm run dev
```

### Step 2: Test with curl

**Test 1: Clean message (should work)**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, what can you help me with?", "bot_slug": "default-app-bot"}'
```

**Expected:** HTTP 200 with chat response

---

**Test 2: Check error format**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "bot_slug": "non-existent"}'
```

**Expected:** HTTP 404 with error:
```json
{
  "error": {
    "code": "BOT_NOT_FOUND",
    "message": "Bot not found"
  }
}
```

---

### Step 3: Test via Browser

1. Go to `http://localhost:3000/chat/default-app-bot`
2. Type a normal message → should work ✅
3. Open browser DevTools → Network tab
4. Send a message and check the response format

---

### Step 4: Check Audit Logs

**Option A: Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Run:
```sql
SELECT * FROM bot_audit_log 
WHERE action = 'content_moderation_flagged' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Option B: Using the SQL script**
```bash
psql "your-supabase-connection-string" -f scripts/check-moderation-logs.sql
```

---

## 🧪 Test Flagged Content

⚠️ **Note:** OpenAI's moderation is ML-based, so you may need to use actual inappropriate content to trigger flags. For development testing:

### Option 1: Use the test script
```bash
./scripts/test-moderation.sh default-app-bot
```

### Option 2: Manual test with known triggers

Try messages containing:
- Explicit language
- Hate speech keywords
- Violence references
- Self-harm mentions

**Important:** Only test in development environments!

---

## ✅ Verification Checklist

After testing, verify:

- [ ] Clean messages work (HTTP 200)
- [ ] Error responses use standardized format: `{ error: { code, message } }`
- [ ] Flagged content returns HTTP 422 with `MODERATION_FLAGGED` code
- [ ] Flagged content appears in `bot_audit_log` table
- [ ] Audit logs include: categories, message preview, IP, user agent
- [ ] UI displays user-friendly error messages

---

## 🐛 Troubleshooting

**Moderation not working?**
- Check `OPENAI_API_KEY` is set in `.env.local`
- Check server logs for errors
- Verify moderation function is being called

**Logs not appearing?**
- Check `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify admin client can write to `bot_audit_log`
- Check RLS policies allow inserts

**Wrong error format?**
- Verify `errorToResponse` is called in route handler
- Check error codes match `ErrorCode` enum

---

## 📚 More Details

See [full testing guide](./test-moderation.md) for comprehensive testing instructions.



