# Test Environment Setup

## Setting Up Test Credentials

1. Create a `.env.test` file in the project root:

```bash
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=YourTestPassword123!
```

2. Or set environment variables when running tests:

```bash
TEST_USER_EMAIL=test@example.com TEST_USER_PASSWORD=pass npm run test:e2e
```

## Test User Requirements

Your test user should:
- Be a real user account in your Supabase database
- Have appropriate permissions for testing
- Not be used for production data

## Security Note

- Never commit `.env.test` to version control
- Use a dedicated test account, not a production account
- Consider using a separate Supabase project for testing

