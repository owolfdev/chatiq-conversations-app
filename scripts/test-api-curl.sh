#!/bin/bash

# ChatIQ API Test Script
# Replace YOUR_API_KEY and YOUR_BOT_SLUG with your actual values

API_KEY="YOUR_API_KEY_HERE"
BOT_SLUG="YOUR_BOT_SLUG_HERE"
API_URL="https://chatiq.io/api"

echo "Testing ChatIQ API..."
echo "Bot Slug: $BOT_SLUG"
echo ""

curl -X POST "${API_URL}/chat" \
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

