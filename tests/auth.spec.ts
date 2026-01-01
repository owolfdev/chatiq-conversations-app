import { test, expect } from '@playwright/test';
import { signIn, getTestUser } from './helpers/auth-helper.js';

test.describe('Authentication', () => {
  test('user can sign up', async ({ page }) => {
    await page.goto('/sign-up');
    
    // Fill sign up form
    const testEmail = `test-${Date.now()}@example.com`;
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show success message (stays on sign-up page with success param)
    await expect(page).toHaveURL(/sign-up.*success/, { timeout: 10000 });
  });

  test('user can sign in with test credentials', async ({ page }) => {
    const { email, password } = getTestUser();
    
    await signIn(page, email, password);
    
    // Should be on dashboard or home page
    await expect(page).toHaveURL(/\/(dashboard|$)/, { timeout: 10000 });
  });

  test('user can access forgot password', async ({ page }) => {
    await page.goto('/sign-in');
    
    // Click forgot password link
    await page.click('text=Forgot password');
    
    await expect(page).toHaveURL(/forgot-password/);
  });

  test('protected routes redirect to sign-in when not authenticated', async ({ browser }) => {
    // Use a fresh context to ensure no authentication
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      // Test a route that we know redirects (dashboard/conversations checks auth and redirects)
      // The main /dashboard page doesn't redirect, but sub-pages do
      await page.goto('/dashboard/conversations', { waitUntil: 'networkidle' });
      
      // Should redirect to sign-in (beta mode is disabled for tests)
      await expect(page).toHaveURL(/sign-in/, { timeout: 10000 });
    } finally {
      await context.close();
    }
  });
});

