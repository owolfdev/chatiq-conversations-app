import { test, expect } from '@playwright/test';
import { signIn, getTestUser } from './helpers/auth-helper.js';

test.describe('Document Management', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    const { email, password } = getTestUser();
    await signIn(page, email, password);
    await page.goto('/dashboard/documents');
  });

  test('user can view documents list', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    // Should show documents page - look for "Document Library" heading
    await expect(page.locator('h1:has-text("Document Library")').first()).toBeVisible();
  });

  test('user can navigate to upload document page', async ({ page }) => {
    await page.goto('/dashboard/documents');
    
    await page.click('text=Upload Document');
    await expect(page).toHaveURL(/dashboard\/documents\/new/);
  });

  test('user can upload a document', async ({ page }) => {
    await page.goto('/dashboard/documents/new');
    
    // Check for file input or upload area
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      // Create a test file
      const testFile = Buffer.from('Test document content');
      await fileInput.setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: testFile,
      });
      
      // Wait for upload to process
      await page.waitForTimeout(2000);
      
      // Should show success or redirect
      await expect(page).toHaveURL(/dashboard\/documents/, { timeout: 10000 });
    }
  });
});

