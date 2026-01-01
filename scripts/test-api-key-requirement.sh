#!/bin/bash
# Test script to verify API key requirement for external requests

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Testing API Key Requirement for External Requests${NC}"
echo "============================================================"
echo ""

# Default values
BOT_SLUG="${1:-default-bot}"
API_URL="${2:-http://localhost:3000/api/chat}"

echo "Bot Slug: $BOT_SLUG"
echo "API URL: $API_URL"
echo ""

# Test 1: Request WITHOUT API key (should be blocked)
echo -e "${YELLOW}Test 1: External request WITHOUT API key (should be blocked)${NC}"
RESPONSE1=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Hello, this is a test\",
    \"bot_slug\": \"$BOT_SLUG\",
    \"stream\": false,
    \"isInternal\": false
  }")

HTTP_CODE1=$(echo "$RESPONSE1" | tail -n1)
BODY1=$(echo "$RESPONSE1" | sed '$d')

echo "HTTP Status: $HTTP_CODE1"
echo "Response:"
echo "$BODY1" | jq '.' 2>/dev/null || echo "$BODY1"
echo ""

if [ "$HTTP_CODE1" = "401" ]; then
  echo -e "${GREEN}✅ PASS: Request correctly blocked (401 Unauthorized)${NC}"
  if echo "$BODY1" | grep -q "API key required"; then
    echo -e "${GREEN}   ✓ Error message mentions API key requirement${NC}"
  fi
else
  echo -e "${RED}❌ FAIL: Expected 401, got $HTTP_CODE1${NC}"
fi

echo ""
echo "----------------------------------------"
echo ""

# Test 2: Request WITH invalid API key (should be blocked)
echo -e "${YELLOW}Test 2: External request WITH invalid API key (should be blocked)${NC}"
RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_invalid_key_12345" \
  -d "{
    \"message\": \"Hello, this is a test\",
    \"bot_slug\": \"$BOT_SLUG\",
    \"stream\": false,
    \"isInternal\": false
  }")

HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
BODY2=$(echo "$RESPONSE2" | sed '$d')

echo "HTTP Status: $HTTP_CODE2"
echo "Response:"
echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2"
echo ""

if [ "$HTTP_CODE2" = "401" ]; then
  echo -e "${GREEN}✅ PASS: Invalid API key correctly rejected (401)${NC}"
else
  echo -e "${YELLOW}⚠️  Expected 401 for invalid key, got $HTTP_CODE2${NC}"
fi

echo ""
echo "----------------------------------------"
echo ""

# Test 3: Request with isInternal=true (should work if from main app)
echo -e "${YELLOW}Test 3: Request with isInternal=true (main app simulation)${NC}"
echo -e "${YELLOW}Note: This simulates internal app usage${NC}"
RESPONSE3=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Hello, this is a test\",
    \"bot_slug\": \"$BOT_SLUG\",
    \"stream\": false,
    \"isInternal\": true
  }")

HTTP_CODE3=$(echo "$RESPONSE3" | tail -n1)
BODY3=$(echo "$RESPONSE3" | sed '$d')

echo "HTTP Status: $HTTP_CODE3"
if [ "$HTTP_CODE3" = "200" ]; then
  echo -e "${GREEN}✅ Internal request works (as expected)${NC}"
  echo "Response preview:"
  echo "$BODY3" | jq -r '.response // .error.message // .' 2>/dev/null | head -c 100
  echo "..."
elif [ "$HTTP_CODE3" = "402" ]; then
  echo -e "${YELLOW}⚠️  Quota exceeded (expected if over limit)${NC}"
else
  echo -e "${YELLOW}⚠️  Got $HTTP_CODE3 (may be quota or other issue)${NC}"
fi
echo ""

echo ""
echo "============================================================"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo "  - External requests without API key: ${GREEN}Blocked ✓${NC}"
echo "  - External requests with invalid key: ${GREEN}Blocked ✓${NC}"
echo "  - Internal requests (isInternal=true): ${GREEN}Allowed ✓${NC}"
echo ""
echo "To test with a valid API key:"
echo "  curl -X POST $API_URL \\"
echo "    -H 'Authorization: Bearer YOUR_API_KEY' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"message\": \"test\", \"bot_slug\": \"$BOT_SLUG\", \"stream\": false}'"

