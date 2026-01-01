# ChatIQ API cURL Test Commands

## Quick Test

Replace `YOUR_API_KEY` and `YOUR_BOT_SLUG` with your actual values:

**Important:** Use `www.chatiq.io` (not `chatiq.io`) - the domain redirects!

```bash
curl -X POST https://www.chatiq.io/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "message": "Hello, can you tell me about your services?",
    "bot_slug": "YOUR_BOT_SLUG",
    "stream": false
  }'
```

## Expected Success Response

```json
{
  "response": "Hello! I'd be happy to help you learn about our services...",
  "conversationId": "uuid-here"
}
```

## Expected Error Responses

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

### Rate Limit Exceeded (429)
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded"
  }
}
```

## Test with Variables

```bash
# Set your values
API_KEY="sk_live_your_actual_key_here"
BOT_SLUG="your-bot-slug"

# Run the test
curl -X POST https://chatiq.io/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d "{
    \"message\": \"What are your business hours?\",
    \"bot_slug\": \"${BOT_SLUG}\",
    \"stream\": false
  }"
```

## Test with Conversation Context

```bash
# First message
CONVERSATION_ID=$(curl -X POST https://chatiq.io/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d "{
    \"message\": \"Hello\",
    \"bot_slug\": \"${BOT_SLUG}\",
    \"stream\": false
  }" | jq -r '.conversationId')

# Follow-up message (using conversation ID)
curl -X POST https://chatiq.io/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d "{
    \"message\": \"Tell me more\",
    \"bot_slug\": \"${BOT_SLUG}\",
    \"conversation_id\": \"${CONVERSATION_ID}\",
    \"stream\": false
  }"
```

## Pretty Print Response (with jq)

```bash
curl -X POST https://chatiq.io/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "message": "Hello",
    "bot_slug": "YOUR_BOT_SLUG",
    "stream": false
  }' | jq '.'
```

## Test Streaming Mode

```bash
curl -X POST https://chatiq.io/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "message": "Tell me a story",
    "bot_slug": "YOUR_BOT_SLUG",
    "stream": true
  }'
```

You'll see Server-Sent Events (SSE) format:
```
data: {"choices":[{"delta":{"content":"Once"}}]}

data: {"choices":[{"delta":{"content":" upon"}}]}

data: {"choices":[{"delta":{"content":" a"}}]}

...

data: [DONE]
```

## Troubleshooting

### "Invalid API key"
- Check that you copied the full key (starts with `sk_live_`)
- Make sure there are no extra spaces
- Verify the key is active in your dashboard

### "bot_slug required"
- Make sure you're using the correct bot slug (not the bot name)
- Check the slug in your ChatIQ dashboard

### Connection refused / Timeout
- Verify the API URL: `https://chatiq.io/api`
- Check your internet connection
- For local dev, use: `http://localhost:3000/api`

### Rate limit errors
- Check your plan limits in the dashboard
- Wait for the rate limit window to reset (daily)

