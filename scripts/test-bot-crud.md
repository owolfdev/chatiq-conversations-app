# Bot CRUD Testing Guide

Test the bot CRUD operations and slug uniqueness enforcement.

## Test 1: Create Bot with Unique Slug ✅

1. Go to `/dashboard/bots/new`
2. Fill in the form:
   - Name: "Test Bot 1"
   - Slug: "test-bot-1"
   - Description: "A test bot"
   - System Prompt: "You are a helpful assistant"
   - Status: Active
   - Public: Checked
3. Click "Create Bot"
4. **Expected:**
   - Loading toast appears: "Creating bot..."
   - Success toast: "Bot created successfully"
   - Redirects to `/dashboard/bots`
   - Bot appears in the list

## Test 2: Create Bot with Duplicate Slug ❌

1. Go to `/dashboard/bots/new`
2. Fill in the form with:
   - Name: "Test Bot 2"
   - Slug: "test-bot-1" (same as Test 1)
   - Description: "Another test bot"
   - System Prompt: "You are a helpful assistant"
   - Status: Active
   - Public: Checked
3. Click "Create Bot"
4. **Expected:**
   - Loading toast appears
   - Error toast: "Failed to create bot" with message "Slug already exists. Choose another."
   - Form stays on page (no redirect)
   - Error message shown in form

## Test 3: Update Bot - Change Slug to Unique ✅

1. Go to `/dashboard/bots` and click "Edit" on "Test Bot 1"
2. Change the slug from "test-bot-1" to "test-bot-updated"
3. Click "Save Changes"
4. **Expected:**
   - Loading toast: "Updating bot..."
   - Success toast: "Bot updated successfully"
   - Redirects to `/dashboard/bots`
   - Bot slug is updated

## Test 4: Update Bot - Change Slug to Duplicate ❌

1. Create another bot first:
   - Name: "Test Bot 3"
   - Slug: "test-bot-3"
2. Now edit "Test Bot 1" (or any bot)
3. Try to change its slug to "test-bot-3" (already taken)
4. Click "Save Changes"
5. **Expected:**
   - Loading toast appears
   - Error toast: "Failed to update bot" with message like "Slug 'test-bot-3' is already taken by bot 'Test Bot 3'"
   - Form stays on page
   - Error message shown

## Test 5: Update Bot - Keep Same Slug ✅

1. Edit any bot
2. Change only the name (keep slug the same)
3. Click "Save Changes"
4. **Expected:**
   - Success - no slug conflict error
   - Bot updates successfully

## Test 6: Delete Bot ✅

1. Go to `/dashboard/bots`
2. Click "Delete Bot" on any test bot
3. Confirm deletion in the dialog
4. **Expected:**
   - Loading toast: "Deleting bot..."
   - Success toast: "Bot deleted successfully"
   - Redirects to `/dashboard/bots`
   - Bot is removed from list

## Test 7: Database Constraint Verification

Run this SQL in Supabase SQL Editor to verify the unique constraint exists:

```sql
-- Check if unique index exists
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'bot_bots'
AND indexdef LIKE '%slug%';
```

**Expected:** Should show `idx_bot_bots_slug_unique` with UNIQUE constraint

## Test 8: Race Condition Test (Optional)

This tests that the database constraint prevents race conditions:

1. Open two browser tabs
2. In both tabs, try to create a bot with the same slug simultaneously
3. **Expected:** Only one should succeed, the other should fail with unique constraint error

## Common Issues

- **Toast not appearing:** Check that `Toaster` component is in your root layout
- **Error messages unclear:** Check server action error handling
- **Slug validation not working:** Verify migration was applied correctly

