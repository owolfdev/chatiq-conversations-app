import { test, expect } from '@playwright/test';
import { signIn, getTestUser } from './helpers/auth-helper.js';

test.describe('Billing', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    const { email, password } = getTestUser();
    await signIn(page, email, password);
  });

  test('user can view billing page', async ({ page }) => {
    await page.goto('/dashboard/billing');
    
    // Should show billing information - look for "Billing & Subscription" heading
    await expect(page.locator('h1:has-text("Billing")').first()).toBeVisible();
  });

  test('user can access billing portal', async ({ page }) => {
    await page.goto('/dashboard/billing');
    
    // Look for "Manage Billing" or "Billing Portal" button
    const portalButton = page.locator('button:has-text("Manage")').or(
      page.locator('button:has-text("Portal")')
    );
    
    if (await portalButton.count() > 0) {
      // Click should open Stripe portal (external)
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        portalButton.click(),
      ]);
      
      // Should open Stripe portal
      expect(newPage.url()).toContain('stripe.com');
      await newPage.close();
    }
  });

  test('user can view current plan', async ({ page }) => {
    await page.goto('/dashboard/billing');
    
    // Should show plan information - look for "Free Plan" heading or plan text
    await expect(
      page.locator('h3:has-text("Free Plan")').or(
        page.locator('h3:has-text("Pro Plan")').or(page.locator('h3:has-text("Team Plan")'))
      )
    ).toBeVisible({ timeout: 5000 });
  });
});

