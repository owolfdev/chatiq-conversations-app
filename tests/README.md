# E2E Test Suite

This directory contains end-to-end tests for the ChatIQ SaaS platform using Playwright.

## Test Structure

- `example.spec.ts` - Basic homepage and chat widget tests
- `auth.spec.ts` - Authentication flows (sign up, sign in, password reset)
- `dashboard.spec.ts` - Dashboard navigation and main sections
- `bots.spec.ts` - Bot creation, editing, and management
- `chat.spec.ts` - Chat functionality and streaming
- `documents.spec.ts` - Document upload and management
- `billing.spec.ts` - Billing and subscription management
- `api-keys.spec.ts` - API key creation and management
- `helpers/` - Shared test utilities and helpers

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/auth.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed
```

## Test Environment Setup

1. Create a `.env.test` file with test credentials:
   ```
   TEST_USER_EMAIL=test@example.com
   TEST_USER_PASSWORD=TestPassword123!
   ```

2. Set up test data:
   - Create test bots
   - Set up test documents
   - Configure test billing accounts

## Test Coverage

### ✅ Currently Covered
- Basic homepage loading
- Chat widget opening
- Authentication flows (structure)
- Dashboard navigation (structure)
- Bot management (structure)
- Document management (structure)
- Billing flows (structure)
- API key management (structure)

### 🚧 TODO - Critical Missing Tests
- [ ] Full authentication flow with real credentials
- [ ] Bot creation with actual API calls
- [ ] Document upload with file processing
- [ ] Chat message sending and receiving
- [ ] Stripe checkout flow
- [ ] API key creation and usage
- [ ] Team management
- [ ] Conversation history
- [ ] Analytics dashboard
- [ ] Error handling and edge cases
- [ ] Mobile responsiveness
- [ ] Accessibility (a11y) tests

## Best Practices

1. **Use test fixtures** for authentication and common setup
2. **Clean up test data** after each test
3. **Use data-testid attributes** for reliable selectors
4. **Test critical user journeys** end-to-end
5. **Mock external services** (Stripe, email) in tests
6. **Run tests in CI/CD** pipeline

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
```

