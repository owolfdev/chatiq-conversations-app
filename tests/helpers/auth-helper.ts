/**
 * Authentication helper for Playwright tests
 * 
 * This helper provides utilities for authenticating users in tests.
 * Set test credentials in your .env.test file or environment variables.
 */

import { Page } from '@playwright/test';

/**
 * Sign in a user with email and password
 */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  
  // Wait for the form to be visible
  await page.waitForSelector('input[name="email"]', { state: 'visible' });
  
  // Fill email (using name attribute which is more reliable)
  await page.fill('input[name="email"]', email);
  
  // Fill password
  await page.fill('input[name="password"]', password);
  
  // Click submit button
  await page.click('button[type="submit"]');
  
  // Wait for redirect - sign-in redirects to "/" (homepage) on success
  // Wait for URL to change away from sign-in page
  try {
    await page.waitForURL((url) => !url.pathname.includes('/sign-in'), { 
      timeout: 15000,
      waitUntil: 'domcontentloaded'
    });
  } catch (error) {
    // Check if we're still on sign-in page (might be an error)
    const currentUrl = page.url();
    if (currentUrl.includes('/sign-in')) {
      // Check for error message
      const hasError = await page.locator('[role="alert"], .error, text=/error|invalid|incorrect/i').first().isVisible().catch(() => false);
      if (hasError) {
        const errorText = await page.locator('[role="alert"], .error').first().textContent().catch(() => 'Unknown error');
        throw new Error(`Sign-in failed: ${errorText}. Check test credentials in .env.test`);
      }
      throw new Error('Sign-in did not redirect - authentication may have failed');
    }
    // If we're not on sign-in, navigation succeeded
  }
}

/**
 * Sign out the current user
 */
export async function signOut(page: Page) {
  // Look for sign out button in various possible locations
  const signOutButton = page
    .locator('button:has-text("Sign out")')
    .or(page.locator('button:has-text("Log out")'))
    .or(page.locator('a:has-text("Sign out")'))
    .or(page.locator('[data-testid="sign-out"]'));
  
  if (await signOutButton.count() > 0) {
    await signOutButton.click();
    await page.waitForURL(/sign-in/, { timeout: 5000 });
  }
}

/**
 * Get test user credentials from environment variables
 * 
 * Set these in your environment or .env.test file:
 * TEST_USER_EMAIL=test@example.com
 * TEST_USER_PASSWORD=TestPassword123!
 * 
 * Or pass them when running tests:
 * TEST_USER_EMAIL=test@example.com TEST_USER_PASSWORD=pass npx playwright test
 */
export function getTestUser() {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  
  if (!email || !password) {
    throw new Error(
      'Test credentials not found. Please set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables.'
    );
  }
  
  return { email, password };
}

/**
 * Check if user is authenticated by checking for dashboard or user menu
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Check if we're on dashboard or if user menu is visible
    const isOnDashboard = page.url().includes('/dashboard');
    const hasUserMenu = await page.locator('[data-testid="user-menu"]').count() > 0;
    
    return isOnDashboard || hasUserMenu;
  } catch {
    return false;
  }
}

