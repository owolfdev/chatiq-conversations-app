# Troubleshooting ChatIQ API Connection

## Issue: "Redirecting..." Response

If you're getting a "Redirecting..." message, the domain `chatiq.io` might not be set up yet. Try these options:

### Option 1: Test on Localhost (Development)

If you're running the ChatIQ app locally:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_REDACTED" \
  -d '{
    "message": "Hello, can you tell me about your services?",
    "bot_slug": "owolf-dot-com-support-bot",
    "stream": false
  }'
```

**Make sure:**
1. The ChatIQ app is running: `npm run dev`
2. The server is on port 3000
3. You're using the correct API key and bot slug

### Option 2: Find Your Deployment URL

If you've deployed to Vercel or another platform:

1. **Check Vercel Dashboard:**
   - Go to your Vercel project
   - Find the deployment URL (e.g., `your-app.vercel.app`)
   - Use that instead of `chatiq.io`

2. **Test with deployment URL:**
```bash
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "message": "Hello",
    "bot_slug": "your-bot-slug",
    "stream": false
  }'
```

### Option 3: Check Domain Configuration

If `chatiq.io` should be working:

1. **Verify DNS is set up:**
   ```bash
   nslookup chatiq.io
   # or
   dig chatiq.io
   ```

2. **Check if it's redirecting:**
   ```bash
   curl -I https://chatiq.io
   # Look for Location header
   ```

3. **Follow redirects:**
   ```bash
   curl -L -X POST https://chatiq.io/api/chat \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -d '{"message":"Hello","bot_slug":"your-slug","stream":false}'
   ```

### Option 4: Check Environment Variables

Make sure your deployment has the correct environment variables:

- `NEXT_PUBLIC_APP_URL` should match your actual domain
- All other required env vars are set

### Quick Diagnostic Commands

**Test if the domain responds:**
```bash
curl -I https://chatiq.io
```

**Test API endpoint directly:**
```bash
curl -v -X POST https://chatiq.io/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"message":"test","bot_slug":"test","stream":false}'
```

The `-v` flag will show you the full HTTP conversation including redirects.

## Expected Responses

### Success (200 OK)
```json
{
  "response": "Hello! I'd be happy to help...",
  "conversationId": "uuid-here"
}
```

### Invalid API Key (401)
```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Invalid API key"
  }
}
```

### Missing Bot Slug (400)
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid input: bot_slug required"
  }
}
```

## Next Steps

1. **If localhost works:** Your API is fine, just need to configure the production domain
2. **If localhost fails:** Check that the app is running and the API route exists
3. **If deployment URL works:** Update your documentation to use the correct URL

