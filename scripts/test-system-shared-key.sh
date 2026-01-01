#!/bin/bash
# Test script for system shared API key
# This key should work for any public bot across all teams

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Testing System Shared API Key${NC}"
echo "======================================"
echo ""

# Get API key from user
if [ -z "$1" ]; then
  echo -e "${YELLOW}Usage: ./test-system-shared-key.sh YOUR_API_KEY [bot-slug]${NC}"
  echo ""
  echo "Example:"
  echo "  ./test-system-shared-key.sh sk_system_abc123... default-bot"
  echo ""
  exit 1
fi

API_KEY="$1"
BOT_SLUG="${2:-default-bot}"
API_URL="${3:-http://localhost:3000/api/chat}"

echo "API Key: ${API_KEY:0:20}... (masked)"
echo "Bot Slug: $BOT_SLUG"
echo "API URL: $API_URL"
echo ""

# Test 1: Access public bot with system shared key
echo -e "${YELLOW}Test 1: Accessing public bot with system shared key${NC}"
RESPONSE1=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"message\": \"Hello, this is a test with system shared key\",
    \"bot_slug\": \"$BOT_SLUG\",
    \"stream\": false
  }")

HTTP_CODE1=$(echo "$RESPONSE1" | tail -n1)
BODY1=$(echo "$RESPONSE1" | sed '$d')

echo "HTTP Status: $HTTP_CODE1"
if [ "$HTTP_CODE1" = "200" ]; then
  echo -e "${GREEN}✅ SUCCESS: System shared key works!${NC}"
  echo "Response preview:"
  echo "$BODY1" | jq -r '.response // .error.message // .' 2>/dev/null | head -c 150
  echo "..."
elif [ "$HTTP_CODE1" = "402" ]; then
  echo -e "${YELLOW}⚠️  Quota exceeded (expected if bot owner is over limit)${NC}"
  echo "Response:"
  echo "$BODY1" | jq '.' 2>/dev/null || echo "$BODY1"
elif [ "$HTTP_CODE1" = "401" ]; then
  echo -e "${RED}❌ FAIL: Unauthorized - check your API key${NC}"
  echo "Response:"
  echo "$BODY1" | jq '.' 2>/dev/null || echo "$BODY1"
else
  echo -e "${RED}❌ FAIL: Unexpected status $HTTP_CODE1${NC}"
  echo "Response:"
  echo "$BODY1" | jq '.' 2>/dev/null || echo "$BODY1"
fi

echo ""
echo "----------------------------------------"
echo ""

# Test 2: Verify it requires bot_slug
echo -e "${YELLOW}Test 2: System shared key requires bot_slug${NC}"
RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"message\": \"Hello\",
    \"stream\": false
  }")

HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
BODY2=$(echo "$RESPONSE2" | sed '$d')

echo "HTTP Status: $HTTP_CODE2"
if echo "$BODY2" | grep -q "Bot slug required"; then
  echo -e "${GREEN}✅ PASS: Correctly requires bot_slug${NC}"
else
  echo -e "${YELLOW}⚠️  Response:${NC}"
  echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2"
fi

echo ""
echo "======================================"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo "  - System shared key can access any public bot: ${GREEN}Tested ✓${NC}"
echo "  - Requires bot_slug parameter: ${GREEN}Tested ✓${NC}"
echo ""
echo "To test with a different bot:"
echo "  ./test-system-shared-key.sh $API_KEY other-bot-slug"

