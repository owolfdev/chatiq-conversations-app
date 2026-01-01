# Beta Mode and E2E Tests

## Why Beta Mode is Disabled for Tests

Beta mode is **automatically disabled** for E2E tests because:

1. **Test Reliability**: Beta mode redirects unauthenticated users to `/beta-access` instead of `/sign-in`, which breaks tests that expect standard authentication flows.

2. **Simpler Test Logic**: Tests should focus on core functionality, not access control features.

3. **Real User Flows**: When beta mode is disabled, tests verify the actual user experience that will exist after public launch.

## How It's Configured

Beta mode is disabled in `playwright.config.ts`:

```typescript
webServer: {
  command: 'npm run dev',
  env: {
    BETA_MODE: 'false',
    NEXT_PUBLIC_BETA_MODE: 'false',
  },
}
```

This ensures the test server runs with beta mode disabled, regardless of your `.env` file settings.

## Testing Beta Mode Behavior

If you need to test beta mode behavior specifically, you can:

1. **Create a separate test file** that enables beta mode:
   ```typescript
   test.describe('Beta Mode', () => {
     test.use({
       // Override environment for this test suite
     });
   });
   ```

2. **Or test it manually** by enabling beta mode in your `.env` and testing in the browser.

## Production vs Test Environment

- **Production**: Beta mode can be enabled/disabled via environment variables
- **Tests**: Beta mode is always disabled to ensure consistent test behavior

