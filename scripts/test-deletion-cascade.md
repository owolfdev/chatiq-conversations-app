# Testing User Deletion Cascade

This test verifies that deleting a user from Supabase Auth properly cascades deletion of all related data through the `handle_user_deletion()` trigger.

## What Gets Tested

The test creates a user with the following related data:
- User profile (`bot_user_profiles`)
- Team (`bot_teams`) and team membership (`bot_team_members`)
- Bot (`bot_bots`)
- Collection (`bot_collections`)
- Document (`bot_documents`)
- Conversation (`bot_conversations`) and messages (`bot_messages`)
- API key (`bot_api_keys`)
- Activity log (`bot_user_activity_logs`)
- Log entry (`bot_logs`)

Then it deletes the user and verifies all of the above data is properly cleaned up.

## How to Run

### Option 1: Using psql with Local Supabase (Recommended)

```bash
# Make sure you're in the project root directory
cd /Users/wolf/Documents/Development/Projects/ChatBot/chat-bot-saas

# First, make sure Supabase is running locally
supabase start

# Run the test script against local Supabase (port 54322 is the default local DB port)
psql "postgresql://postgres:postgres@localhost:54322/postgres" -f scripts/test-deletion-cascade.sql

# Or pipe it directly
cat scripts/test-deletion-cascade.sql | psql "postgresql://postgres:postgres@localhost:54322/postgres"
```

**Note:** The default local Supabase password is `postgres`. If you've changed it, use your actual password.

### Option 2: Using psql

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[password]@[host]:[port]/postgres"

# Run the test script
\i scripts/test-deletion-cascade.sql
```

### Option 3: Using Supabase Studio

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `scripts/test-deletion-cascade.sql`
4. Run the query

## Expected Output

The script will output:
- Progress messages as test data is created
- Before/after counts for each table
- A success message if all data was properly deleted
- Error messages if any data remains

### Success Example

```
========================================
✅ CASCADE DELETION SUCCESSFUL!
========================================
All related data has been properly deleted.
```

### Failure Example

```
========================================
❌ CASCADE DELETION FAILED!
========================================
Errors:
  - Bots not deleted
  - Documents not deleted
```

## Manual Testing via UI

You can also test the deletion cascade manually through the application:

1. Sign up a test account (or use an existing test account)
2. Create some data:
   - Create a bot
   - Upload a document
   - Start a conversation
   - Create an API key
3. Go to `/profile` → Settings tab
4. Click "Delete Account" and complete the confirmation
5. Verify:
   - You're redirected to the home page
   - You can't sign in with that account anymore
   - All related data is deleted (check via Supabase Studio SQL Editor)

## Verification Queries

After deleting a user, you can run these queries to verify cleanup:

```sql
-- Replace 'USER_ID_HERE' with the deleted user's ID
SELECT 'profiles' as table_name, COUNT(*) as count 
FROM bot_user_profiles WHERE id = 'USER_ID_HERE'
UNION ALL
SELECT 'teams', COUNT(*) 
FROM bot_teams WHERE owner_id = 'USER_ID_HERE'
UNION ALL
SELECT 'team_members', COUNT(*) 
FROM bot_team_members WHERE user_id = 'USER_ID_HERE'
UNION ALL
SELECT 'bots', COUNT(*) 
FROM bot_bots WHERE user_id = 'USER_ID_HERE'
UNION ALL
SELECT 'documents', COUNT(*) 
FROM bot_documents d 
JOIN bot_teams t ON d.team_id = t.id 
WHERE t.owner_id = 'USER_ID_HERE'
UNION ALL
SELECT 'conversations', COUNT(*) 
FROM bot_conversations c 
JOIN bot_teams t ON c.team_id = t.id 
WHERE t.owner_id = 'USER_ID_HERE'
UNION ALL
SELECT 'api_keys', COUNT(*) 
FROM bot_api_keys WHERE user_id = 'USER_ID_HERE'
UNION ALL
SELECT 'activity_logs', COUNT(*) 
FROM bot_user_activity_logs WHERE user_id = 'USER_ID_HERE';

-- All counts should be 0
```

## Troubleshooting

If the test fails:

1. **Check the trigger exists:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_deleted';
   ```

2. **Check the function exists:**
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'handle_user_deletion';
   ```

3. **Verify foreign key constraints:**
   ```sql
   SELECT 
     tc.table_name, 
     kcu.column_name, 
     ccu.table_name AS foreign_table_name,
     ccu.column_name AS foreign_column_name,
     rc.delete_rule
   FROM information_schema.table_constraints AS tc 
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   JOIN information_schema.referential_constraints AS rc
     ON rc.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY' 
     AND (ccu.table_name = 'bot_user_profiles' OR ccu.table_name = 'bot_teams')
     AND rc.delete_rule != 'CASCADE';
   ```
   
   All foreign keys should have `delete_rule = 'CASCADE'`.
