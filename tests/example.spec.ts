import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  
  // Wait for the page to load
  await expect(page).toHaveTitle(/ChatIQ/i);
});

test('chat widget opens', async ({ page }) => {
  await page.goto('/');
  
  // Find and click the chat widget button
  const chatButton = page.locator('button[aria-label="Open chat"]').or(page.locator('button:has-text("Chat")'));
  
  if (await chatButton.count() > 0) {
    await chatButton.click();
    
    // Check if chat widget is visible
    await expect(page.locator('text=Chat with us').or(page.locator('[role="dialog"]'))).toBeVisible();
  }
});

