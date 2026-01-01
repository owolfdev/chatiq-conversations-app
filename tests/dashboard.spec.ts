import { test, expect } from '@playwright/test';
import { signIn, getTestUser } from './helpers/auth-helper.js';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    const { email, password } = getTestUser();
    await signIn(page, email, password);
    // Sign-in redirects to "/" (homepage), so navigate to dashboard
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  });

  test('dashboard loads and shows main sections', async ({ page }) => {
    // Already on dashboard from beforeEach, just verify
    await expect(page.locator('h1:has-text("Welcome")')).toBeVisible({ timeout: 10000 });
  });

  test('user can navigate to bots page', async ({ page }) => {
    // Wait for sidebar link to be visible, then click "My Bots"
    await page.getByRole('link', { name: 'My Bots' }).waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('link', { name: 'My Bots' }).click();
    await expect(page).toHaveURL(/dashboard\/bots/, { timeout: 10000 });
  });

  test('user can navigate to documents page', async ({ page }) => {
    // Wait for sidebar link, then click "Documents" - use first() to avoid multiple matches
    const documentsLink = page.getByRole('link', { name: 'Documents' }).first();
    await documentsLink.waitFor({ state: 'visible', timeout: 10000 });
    await documentsLink.click();
    await expect(page).toHaveURL(/dashboard\/documents/, { timeout: 10000 });
  });

  test('user can navigate to conversations page', async ({ page }) => {
    // Wait for sidebar link, then click "Conversations"
    await page.getByRole('link', { name: 'Conversations' }).waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('link', { name: 'Conversations' }).click();
    await expect(page).toHaveURL(/dashboard\/conversations/, { timeout: 10000 });
  });

  test('user can navigate to billing page', async ({ page }) => {
    // Wait for sidebar link, then click "Billing"
    await page.getByRole('link', { name: 'Billing' }).waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('link', { name: 'Billing' }).click();
    await expect(page).toHaveURL(/dashboard\/billing/, { timeout: 10000 });
  });

  test('user can navigate to settings page', async ({ page }) => {
    // Wait for sidebar link, then click "Settings"
    await page.getByRole('link', { name: 'Settings' }).waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/dashboard\/settings/, { timeout: 10000 });
  });
});

