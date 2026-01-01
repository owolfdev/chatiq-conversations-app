#!/bin/bash
# Test script to verify quota enforcement is working
# This tests if messages are blocked when quota is exceeded

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Quota Enforcement${NC}"
echo "================================"
echo ""

# Default values
BOT_SLUG="${1:-default-bot}"
API_URL="${2:-http://localhost:3000/api/chat}"

echo "Bot Slug: $BOT_SLUG"
echo "API URL: $API_URL"
echo ""

# Test 1: Send a message (should work if under quota, or fail if over)
echo -e "${YELLOW}Test 1: Sending a chat message...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Hello, this is a test message\",
    \"bot_slug\": \"$BOT_SLUG\",
    \"stream\": false
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Check if quota exceeded
if [ "$HTTP_CODE" = "402" ]; then
  echo -e "${GREEN}✅ Quota enforcement is working!${NC}"
  echo -e "${GREEN}   Message was blocked with HTTP 402 (Payment Required)${NC}"
  
  # Check if error code is QUOTA_EXCEEDED
  if echo "$BODY" | grep -q "QUOTA_EXCEEDED"; then
    echo -e "${GREEN}   Error code: QUOTA_EXCEEDED ✓${NC}"
  else
    echo -e "${YELLOW}   Warning: Response doesn't contain QUOTA_EXCEEDED code${NC}"
  fi
elif [ "$HTTP_CODE" = "200" ]; then
  echo -e "${YELLOW}⚠️  Message was accepted (HTTP 200)${NC}"
  echo -e "${YELLOW}   This could mean:${NC}"
  echo -e "${YELLOW}   - You're under quota limit${NC}"
  echo -e "${YELLOW}   - Quota check isn't working${NC}"
  echo -e "${YELLOW}   - Message matched a canned response (doesn't count)${NC}"
else
  echo -e "${RED}❌ Unexpected response: HTTP $HTTP_CODE${NC}"
  echo "   This might indicate an error in the quota check logic"
fi

echo ""
echo "================================"
echo ""
echo "To test with a specific bot slug:"
echo "  ./test-quota-enforcement.sh your-bot-slug"
echo ""
echo "To test against a different URL:"
echo "  ./test-quota-enforcement.sh your-bot-slug http://localhost:3000/api/chat"

