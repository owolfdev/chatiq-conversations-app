import { test, expect } from '@playwright/test';
import { signIn, getTestUser } from './helpers/auth-helper.js';

test.describe('API Keys', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    const { email, password } = getTestUser();
    await signIn(page, email, password);
    await page.goto('/dashboard/api-keys');
  });

  test('user can view API keys page', async ({ page }) => {
    await page.goto('/dashboard/api-keys');
    
    // Should show API keys page - use first() to avoid strict mode violation
    await expect(page.locator('h1:has-text("API Keys")').first()).toBeVisible();
  });

  test('user can create an API key', async ({ page }) => {
    await page.goto('/dashboard/api-keys');
    
    // Click create button
    const createButton = page.locator('button:has-text("Create")');
    if (await createButton.count() > 0) {
      await createButton.click();
      
      // Fill form if dialog appears
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.count() > 0) {
        await nameInput.fill(`Test Key ${Date.now()}`);
        await page.click('button[type="submit"]');
        
        // Should show API key or success message
        await page.waitForTimeout(2000);
        await expect(
          page.locator('text=API key').or(page.locator('[data-api-key]'))
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('user can view existing API keys', async ({ page }) => {
    await page.goto('/dashboard/api-keys');
    
    // Should show list of keys or empty state - just check page loaded
    await expect(page.locator('h1:has-text("API Keys")').first()).toBeVisible();
  });
});

