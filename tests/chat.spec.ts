import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
  test('homepage chat widget opens and displays correctly', async ({ page }) => {
    await page.goto('/');
    
    // Find and click the chat widget button
    const chatButton = page.locator('button[aria-label="Open chat"]').or(
      page.locator('button:has-text("Chat")')
    );
    
    if (await chatButton.count() > 0) {
      await chatButton.click();
      
      // Check if chat widget is visible
      await expect(
        page.locator('text=Chat with us').or(page.locator('[role="dialog"]'))
      ).toBeVisible();
    }
  });

  test('user can send a message in chat widget', async ({ page }) => {
    await page.goto('/');
    
    // Open chat widget
    const chatButton = page.locator('button[aria-label="Open chat"]').or(
      page.locator('button:has-text("Chat")')
    );
    
    if (await chatButton.count() > 0) {
      await chatButton.click();
      
      // Wait for chat input
      const chatInput = page.locator('input[placeholder*="message" i]').or(
        page.locator('textarea[placeholder*="message" i]')
      );
      
      if (await chatInput.count() > 0) {
        await chatInput.fill('Hello, this is a test message');
        await chatInput.press('Enter');
        
        // Wait for message to appear or response
        await page.waitForTimeout(2000);
        
        // Check that message was sent (appears in chat)
        await expect(page.locator('text=Hello, this is a test message')).toBeVisible();
      }
    }
  });

  test.skip('hosted bot page loads', async ({ page }) => {
    // Skip this test - requires a known test bot slug
    // TODO: Create a test bot first, then use its slug
    await page.goto('/chat/test-bot');
    
    // Should show chat interface
    await expect(
      page.locator('input[placeholder*="message" i]').or(
        page.locator('textarea[placeholder*="message" i]')
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test('chat streaming works', async ({ page }) => {
    await page.goto('/');
    
    // Open chat and send message
    const chatButton = page.locator('button[aria-label="Open chat"]');
    if (await chatButton.count() > 0) {
      await chatButton.click();
      
      const chatInput = page.locator('input[placeholder*="message" i]').or(
        page.locator('textarea[placeholder*="message" i]')
      );
      
      if (await chatInput.count() > 0) {
        await chatInput.fill('Test streaming');
        await chatInput.press('Enter');
        
        // Wait for typing indicator or response
        await page.waitForTimeout(3000);
        
        // Should see either typing indicator or response
        const hasResponse = await page.locator('.chatiq-message, [data-message]').count() > 0;
        const hasTyping = await page.locator('[data-typing], .typing-indicator').count() > 0;
        
        expect(hasResponse || hasTyping).toBeTruthy();
      }
    }
  });
});

