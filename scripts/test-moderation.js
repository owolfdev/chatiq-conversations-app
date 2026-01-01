#!/usr/bin/env node
/**
 * Node.js script to test moderation middleware
 * Usage: node scripts/test-moderation.js [botSlug] [apiKey]
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const BOT_SLUG = process.argv[2] || 'default-app-bot';
const API_KEY = process.argv[3] || '';

// Test cases
const testCases = [
  {
    name: 'Clean message',
    message: 'Hello, how are you today?',
    shouldPass: true,
  },
  {
    name: 'Technical question',
    message: 'How do I implement authentication in Next.js?',
    shouldPass: true,
  },
  {
    name: 'Business question',
    message: 'What are the best practices for API design?',
    shouldPass: true,
  },
];

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

async function testMessage(testCase) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: testCase.message,
        bot_slug: BOT_SLUG,
        stream: false,
      }),
    });

    const data = await response.json();
    const status = response.status;

    // Check if it's a moderation error
    const isModerationError =
      status === 422 &&
      data.error?.code === 'MODERATION_FLAGGED';

    const passed =
      testCase.shouldPass
        ? status === 200 && !isModerationError
        : isModerationError;

    return {
      ...testCase,
      status,
      passed,
      isModerationError,
      response: data,
    };
  } catch (error) {
    return {
      ...testCase,
      status: 0,
      passed: false,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log(`${colors.blue}🧪 Testing Moderation Middleware${colors.reset}`);
  console.log('='.repeat(50));
  console.log(`Bot Slug: ${BOT_SLUG}`);
  console.log(`Base URL: ${BASE_URL}`);
  if (API_KEY) {
    console.log(`API Key: ${API_KEY.substring(0, 20)}...`);
  }
  console.log('');

  let passedCount = 0;
  let failedCount = 0;

  for (const testCase of testCases) {
    console.log(`${colors.blue}Test: ${testCase.name}${colors.reset}`);
    console.log(`Message: "${testCase.message}"`);
    console.log('');

    const result = await testMessage(testCase);

    if (result.error) {
      console.log(`${colors.red}❌ Error: ${result.error}${colors.reset}`);
      failedCount++;
    } else {
      console.log(`HTTP Status: ${result.status}`);

      if (result.isModerationError) {
        console.log(
          `${colors.yellow}🚩 Moderation Flagged${colors.reset}`
        );
        console.log(
          `Categories: ${JSON.stringify(result.response.error?.details?.flaggedCategories || [])}`
        );
      }

      if (result.passed) {
        console.log(
          `${colors.green}✅ PASS${colors.reset} - Expected behavior`
        );
        passedCount++;
      } else {
        console.log(
          `${colors.red}❌ FAIL${colors.reset} - Unexpected behavior`
        );
        if (result.response?.error) {
          console.log(`Error: ${JSON.stringify(result.response.error, null, 2)}`);
        }
        failedCount++;
      }
    }

    console.log('');
    console.log('-'.repeat(50));
    console.log('');
  }

  // Summary
  console.log(`${colors.blue}Summary${colors.reset}`);
  console.log('='.repeat(50));
  console.log(`${colors.green}Passed: ${passedCount}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedCount}${colors.reset}`);
  console.log(`Total: ${testCases.length}`);
  console.log('');

  // Next steps
  console.log(`${colors.blue}Next Steps:${colors.reset}`);
  console.log('1. Check audit logs in Supabase:');
  console.log('   SELECT * FROM bot_audit_log WHERE action = \'content_moderation_flagged\' ORDER BY created_at DESC;');
  console.log('');
  console.log('2. Review error response format - should include:');
  console.log('   - Standardized format: { error: { code, message, details } }');
  console.log('   - Flagged categories in details.flaggedCategories');
  console.log('');

  process.exit(failedCount > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Error running tests:${colors.reset}`, error);
  process.exit(1);
});



