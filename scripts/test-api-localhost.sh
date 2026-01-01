#!/bin/bash

# Test ChatIQ API on localhost
# Make sure your local server is running: npm run dev

API_KEY="sk_live_REDACTED"
BOT_SLUG="owolf-dot-com-support-bot"

echo "Testing ChatIQ API on localhost..."
echo ""

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d "{
    \"message\": \"Hello, can you tell me about your services?\",
    \"bot_slug\": \"${BOT_SLUG}\",
    \"stream\": false
  }" \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "✅ If you see a JSON response, the API is working!"

