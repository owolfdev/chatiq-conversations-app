#!/bin/bash
# Test script for API key authentication
# Usage: ./scripts/test-api-key.sh YOUR_API_KEY YOUR_BOT_SLUG

API_KEY="${1:-}"
BOT_SLUG="${2:-}"

if [ -z "$API_KEY" ] || [ -z "$BOT_SLUG" ]; then
  echo "Usage: ./scripts/test-api-key.sh YOUR_API_KEY YOUR_BOT_SLUG"
  echo "Example: ./scripts/test-api-key.sh sk_live_abc123... my-bot"
  exit 1
fi

BASE_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3000}"

echo "Testing API key authentication..."
echo "API Key: ${API_KEY:0:20}..."
echo "Bot Slug: $BOT_SLUG"
echo ""

# Test 1: Valid API key should work
echo "Test 1: Valid API key request"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/chat" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Hello, test message\", \"bot_slug\": \"$BOT_SLUG\"}")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"
echo "Response: $BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ PASS: Valid API key works"
else
  echo "❌ FAIL: Valid API key failed (expected 200, got $HTTP_STATUS)"
fi

echo ""
echo "Test 2: Invalid API key should be rejected"
INVALID_KEY="sk_live_invalid_REPLACE_ME"
RESPONSE2=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/chat" \
  -H "Authorization: Bearer $INVALID_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Hello\", \"bot_slug\": \"$BOT_SLUG\"}")

HTTP_STATUS2=$(echo "$RESPONSE2" | grep "HTTP_STATUS" | cut -d: -f2)
BODY2=$(echo "$RESPONSE2" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS2"
echo "Response: $BODY2"
echo ""

if [ "$HTTP_STATUS2" = "500" ] || [ "$HTTP_STATUS2" = "401" ]; then
  echo "✅ PASS: Invalid API key properly rejected"
else
  echo "⚠️  NOTE: Invalid key returned status $HTTP_STATUS2 (expected 500 or 401)"
fi

echo ""
echo "Test 3: Missing API key should use free plan limits"
RESPONSE3=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Hello\", \"bot_slug\": \"$BOT_SLUG\"}")

HTTP_STATUS3=$(echo "$RESPONSE3" | grep "HTTP_STATUS" | cut -d: -f3)
BODY3=$(echo "$RESPONSE3" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS3"
echo "Response: $BODY3"
echo ""

if [ "$HTTP_STATUS3" = "200" ] || [ "$HTTP_STATUS3" = "429" ]; then
  echo "✅ PASS: Request without API key handled (may hit rate limit)"
else
  echo "⚠️  NOTE: No-key request returned status $HTTP_STATUS3"
fi
