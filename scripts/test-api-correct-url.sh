#!/bin/bash

# Test ChatIQ API with correct URL (www.chatiq.io)
# Note: chatiq.io redirects to www.chatiq.io

API_KEY="sk_live_REPLACE_ME"
BOT_SLUG="owolf-dot-com-support-bot"

echo "Testing ChatIQ API on www.chatiq.io..."
echo "Bot Slug: $BOT_SLUG"
echo ""

curl -X POST https://www.chatiq.io/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d "{
    \"message\": \"Hello, can you tell me about your services?\",
    \"bot_slug\": \"${BOT_SLUG}\",
    \"stream\": false
  }" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "✅ If you see a JSON response with 'response' and 'conversationId', the API is working!"
echo ""
echo "⚠️  If you see 'Bot not found', check:"
echo "   1. The bot slug is correct (check your dashboard)"
echo "   2. The bot exists and is active"
echo "   3. The API key has access to this bot"

