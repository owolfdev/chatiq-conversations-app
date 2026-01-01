#!/bin/bash
# Test script for moderation middleware
# Usage: ./scripts/test-moderation.sh [BOT_SLUG] [API_KEY]

BOT_SLUG="${1:-default-app-bot}"
API_KEY="${2:-}"

BASE_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3000}"

echo "🧪 Testing Moderation Middleware"
echo "=================================="
echo "Bot Slug: $BOT_SLUG"
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to make a request and check response
test_message() {
  local test_name="$1"
  local message="$2"
  local should_fail="$3"  # "true" if we expect it to be flagged
  
  echo "Test: $test_name"
  echo "Message: \"$message\""
  
  # Build curl command
  local curl_cmd="curl -s -w \"\nHTTP_STATUS:%{http_code}\" -X POST \"$BASE_URL/api/chat\""
  
  if [ -n "$API_KEY" ]; then
    curl_cmd="$curl_cmd -H \"Authorization: Bearer $API_KEY\""
  fi
  
  curl_cmd="$curl_cmd -H \"Content-Type: application/json\""
  curl_cmd="$curl_cmd -d '{\"message\": \"$message\", \"bot_slug\": \"$BOT_SLUG\", \"stream\": false}'"
  
  # Execute and parse response
  local response=$(eval $curl_cmd)
  local http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
  local body=$(echo "$response" | sed '/HTTP_STATUS/d')
  
  echo "HTTP Status: $http_status"
  echo "Response: $body"
  
  # Check if moderation flag was detected
  if echo "$body" | grep -q "MODERATION_FLAGGED\|moderation\|flagged"; then
    if [ "$should_fail" = "true" ]; then
      echo -e "${GREEN}✅ PASS: Content correctly flagged${NC}"
    else
      echo -e "${YELLOW}⚠️  WARNING: Content was flagged but we expected it to pass${NC}"
    fi
  else
    if [ "$should_fail" = "true" ]; then
      echo -e "${RED}❌ FAIL: Content should have been flagged but wasn't${NC}"
    else
      echo -e "${GREEN}✅ PASS: Content passed moderation${NC}"
    fi
  fi
  
  echo ""
}

# Test 1: Clean message (should pass)
test_message "Clean message" "Hello, how are you today?" "false"

# Test 2: Technical question (should pass)
test_message "Technical question" "How do I implement authentication in Next.js?" "false"

# Test 3: Simple greeting (should pass)
test_message "Simple greeting" "What is the weather like?" "false"

# Test 4: Explicit content test (may be flagged - using a known test phrase)
# Note: Be careful with this - only use for testing
test_message "Potentially flagged content" "This is a test of explicit language" "unknown"

echo ""
echo "📋 Next Steps:"
echo "1. Check the audit log in Supabase for flagged content:"
echo "   SELECT * FROM bot_audit_log WHERE action = 'content_moderation_flagged' ORDER BY created_at DESC;"
echo ""
echo "2. Review the response format - it should include:"
echo "   - Standardized error format: { error: { code, message, details } }"
echo "   - Flagged categories in details.flaggedCategories"
echo ""
echo "3. For manual testing with known flagged content, try messages containing:"
echo "   - Hate speech"
echo "   - Violence"
echo "   - Sexual content"
echo "   - Self-harm references"
echo ""
echo "⚠️  Note: OpenAI's moderation API uses machine learning, so results may vary."
echo "   Some test content may not always trigger flags."

