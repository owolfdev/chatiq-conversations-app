import { test as base } from '@playwright/test';
import { signIn, getTestUser } from '../helpers/auth-helper.js';

/**
 * Authenticated test fixture
 * 
 * Use this fixture to automatically authenticate before each test.
 * 
 * Example:
 * ```ts
 * import { test } from '../fixtures/authenticated';
 * 
 * test('my test', async ({ page }) => {
 *   // User is already authenticated
 *   await page.goto('/dashboard');
 * });
 * ```
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Get test credentials
    const { email, password } = getTestUser();
    
    // Sign in before test
    await signIn(page, email, password);
    
    // Use the authenticated page
    await use(page);
    
    // Optional: Sign out after test (uncomment if needed)
    // await signOut(page);
  },
});

export { expect } from '@playwright/test';

