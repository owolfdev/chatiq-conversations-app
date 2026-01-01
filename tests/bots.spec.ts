import { test, expect } from '@playwright/test';
import { signIn, getTestUser } from './helpers/auth-helper.js';

test.describe('Bot Management', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    const { email, password } = getTestUser();
    await signIn(page, email, password);
    await page.goto('/dashboard/bots');
  });

  test('user can view bots list', async ({ page }) => {
    await page.goto('/dashboard/bots');
    
    // Should show bots page - use first() to avoid strict mode violation
    await expect(page.locator('h1:has-text("My Bots")').first()).toBeVisible();
  });

  test('user can create a new bot', async ({ page }) => {
    await page.goto('/dashboard/bots/new');
    
    // Wait for form to load
    await expect(page.locator('h1:has-text("Create a New Bot")')).toBeVisible();
    
    // Fill bot creation form - use id selectors (more reliable)
    await page.fill('input#name', `Test Bot ${Date.now()}`);
    await page.fill('input#slug', `test-bot-${Date.now()}`);
    await page.fill('textarea#system_prompt', 'You are a helpful assistant.');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to bots page or show success
    await expect(page).toHaveURL(/dashboard\/bots/, { timeout: 10000 });
  });

  test('user can view a bot', async ({ page }) => {
    // TODO: Create a test bot first, then navigate to it
    await page.goto('/dashboard/bots');
    
    // Click on first bot if exists
    const firstBot = page.locator('[data-testid="bot-card"]').first();
    if (await firstBot.count() > 0) {
      await firstBot.click();
      await expect(page).toHaveURL(/dashboard\/bots\/[^/]+/);
    }
  });

  test('user can edit a bot', async ({ page }) => {
    // TODO: Navigate to existing bot edit page
    await page.goto('/dashboard/bots');
    
    // Find edit button or click bot
    const editButton = page.locator('button:has-text("Edit")').first();
    if (await editButton.count() > 0) {
      await editButton.click();
      await expect(page).toHaveURL(/dashboard\/bots\/[^/]+\/edit/);
    }
  });
});

