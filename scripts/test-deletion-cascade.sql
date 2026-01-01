-- Test script for user deletion cascade
-- This script tests that deleting a user from auth.users properly cascades
-- deletion of all related data through the handle_user_deletion() trigger

-- ============================================================================
-- STEP 1: Create test user and data
-- ============================================================================

DO $$
DECLARE
  test_user_id uuid;
  test_team_id uuid;
  test_bot_id uuid;
  test_document_id uuid;
  test_conversation_id uuid;
  test_api_key_id uuid;
  test_activity_log_id uuid;
  test_collection_id uuid;
BEGIN
  -- Create test user in auth.users (this will trigger handle_new_user())
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'test-delete-user-' || extract(epoch from now())::text || '@test.com',
    crypt('test-password', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'authenticated'
  ) RETURNING id INTO test_user_id;

  RAISE NOTICE 'Created test user: %', test_user_id;

  -- Wait a moment for triggers to fire
  PERFORM pg_sleep(0.5);

  -- Verify profile was created by trigger
  IF NOT EXISTS (SELECT 1 FROM bot_user_profiles WHERE id = test_user_id) THEN
    RAISE EXCEPTION 'Profile was not created by trigger';
  END IF;

  -- Get the team created by trigger
  SELECT id INTO test_team_id FROM bot_teams WHERE owner_id = test_user_id LIMIT 1;
  
  IF test_team_id IS NULL THEN
    RAISE EXCEPTION 'Team was not created by trigger';
  END IF;

  RAISE NOTICE 'Created test team: %', test_team_id;

  -- Create test bot
  INSERT INTO bot_bots (team_id, user_id, name, slug, system_prompt, status, is_public)
  VALUES (
    test_team_id,
    test_user_id,
    'Test Bot for Deletion',
    'test-bot-delete-' || extract(epoch from now())::text,
    'You are a test bot',
    'active',
    false
  ) RETURNING id INTO test_bot_id;

  RAISE NOTICE 'Created test bot: %', test_bot_id;

  -- Create test collection
  INSERT INTO bot_collections (team_id, name, visibility)
  VALUES (test_team_id, 'Test Collection', 'private')
  RETURNING id INTO test_collection_id;

  RAISE NOTICE 'Created test collection: %', test_collection_id;

  -- Create test document
  INSERT INTO bot_documents (team_id, collection_id, title, content, version)
  VALUES (
    test_team_id,
    test_collection_id,
    'Test Document',
    'This is a test document that should be deleted',
    1
  ) RETURNING id INTO test_document_id;

  RAISE NOTICE 'Created test document: %', test_document_id;

  -- Create test conversation
  INSERT INTO bot_conversations (team_id, bot_id, user_id, title, session_id)
  VALUES (
    test_team_id,
    test_bot_id,
    test_user_id,
    'Test Conversation',
    'test-session-' || extract(epoch from now())::text
  ) RETURNING id INTO test_conversation_id;

  RAISE NOTICE 'Created test conversation: %', test_conversation_id;

  -- Create test message
  INSERT INTO bot_messages (conversation_id, sender, content)
  VALUES (
    test_conversation_id,
    'user',
    'This is a test message'
  );

  RAISE NOTICE 'Created test message';

  -- Create test API key
  INSERT INTO bot_api_keys (team_id, bot_id, user_id, key, label)
  VALUES (
    test_team_id,
    test_bot_id,
    test_user_id,
    'test-api-key-' || extract(epoch from now())::text,
    'Test API Key'
  ) RETURNING id INTO test_api_key_id;

  RAISE NOTICE 'Created test API key: %', test_api_key_id;

  -- Create test activity log
  INSERT INTO bot_user_activity_logs (team_id, user_id, type, message, metadata)
  VALUES (
    test_team_id,
    test_user_id,
    'test_action',
    'Test activity log',
    '{"test": true}'::jsonb
  ) RETURNING id INTO test_activity_log_id;

  RAISE NOTICE 'Created test activity log: %', test_activity_log_id;

  -- Create test log entry
  INSERT INTO bot_logs (team_id, bot_id, user_message, assistant_response)
  VALUES (
    test_team_id,
    test_bot_id,
    'Test user message',
    'Test assistant response'
  );

  RAISE NOTICE 'Created test log entry';

  -- Store test_user_id in a temporary table for the next step
  CREATE TEMP TABLE IF NOT EXISTS test_deletion_user_id (user_id uuid);
  DELETE FROM test_deletion_user_id;
  INSERT INTO test_deletion_user_id VALUES (test_user_id);

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE 'Test User ID: %', test_user_id;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 2: Verify data exists before deletion
-- ============================================================================

DO $$
DECLARE
  test_user_id uuid;
  counts record;
BEGIN
  SELECT user_id INTO test_user_id FROM test_deletion_user_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'BEFORE DELETION - Data Counts:';
  RAISE NOTICE '========================================';

  SELECT 
    (SELECT COUNT(*) FROM bot_user_profiles WHERE id = test_user_id) as profiles,
    (SELECT COUNT(*) FROM bot_teams WHERE owner_id = test_user_id) as teams,
    (SELECT COUNT(*) FROM bot_team_members WHERE user_id = test_user_id) as team_memberships,
    (SELECT COUNT(*) FROM bot_bots WHERE user_id = test_user_id) as bots,
    (SELECT COUNT(*) FROM bot_documents d 
     JOIN bot_teams t ON d.team_id = t.id 
     WHERE t.owner_id = test_user_id) as documents,
    (SELECT COUNT(*) FROM bot_conversations c 
     JOIN bot_teams t ON c.team_id = t.id 
     WHERE t.owner_id = test_user_id) as conversations,
    (SELECT COUNT(*) FROM bot_messages m 
     JOIN bot_conversations c ON m.conversation_id = c.id 
     JOIN bot_teams t ON c.team_id = t.id 
     WHERE t.owner_id = test_user_id) as messages,
    (SELECT COUNT(*) FROM bot_api_keys WHERE user_id = test_user_id) as api_keys,
    (SELECT COUNT(*) FROM bot_user_activity_logs WHERE user_id = test_user_id) as activity_logs,
    (SELECT COUNT(*) FROM bot_logs l 
     JOIN bot_bots b ON l.bot_id = b.id 
     WHERE b.user_id = test_user_id) as logs
  INTO counts;

  RAISE NOTICE 'Profiles: %', counts.profiles;
  RAISE NOTICE 'Teams: %', counts.teams;
  RAISE NOTICE 'Team Memberships: %', counts.team_memberships;
  RAISE NOTICE 'Bots: %', counts.bots;
  RAISE NOTICE 'Documents: %', counts.documents;
  RAISE NOTICE 'Conversations: %', counts.conversations;
  RAISE NOTICE 'Messages: %', counts.messages;
  RAISE NOTICE 'API Keys: %', counts.api_keys;
  RAISE NOTICE 'Activity Logs: %', counts.activity_logs;
  RAISE NOTICE 'Logs: %', counts.logs;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 3: Delete the user (this triggers cascade deletion)
-- ============================================================================

DO $$
DECLARE
  test_user_id uuid;
BEGIN
  SELECT user_id INTO test_user_id FROM test_deletion_user_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'DELETING USER: %', test_user_id;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Delete user from auth.users (this triggers handle_user_deletion())
  DELETE FROM auth.users WHERE id = test_user_id;

  RAISE NOTICE 'User deleted from auth.users';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 4: Verify all data was deleted (cascade worked)
-- ============================================================================

DO $$
DECLARE
  test_user_id uuid;
  counts record;
  errors text[] := ARRAY[]::text[];
  err_msg text;
BEGIN
  SELECT user_id INTO test_user_id FROM test_deletion_user_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'AFTER DELETION - Data Counts:';
  RAISE NOTICE '========================================';

  SELECT 
    (SELECT COUNT(*) FROM bot_user_profiles WHERE id = test_user_id) as profiles,
    (SELECT COUNT(*) FROM bot_teams WHERE owner_id = test_user_id) as teams,
    (SELECT COUNT(*) FROM bot_team_members WHERE user_id = test_user_id) as team_memberships,
    (SELECT COUNT(*) FROM bot_bots WHERE user_id = test_user_id) as bots,
    (SELECT COUNT(*) FROM bot_documents d 
     JOIN bot_teams t ON d.team_id = t.id 
     WHERE t.owner_id = test_user_id) as documents,
    (SELECT COUNT(*) FROM bot_conversations c 
     JOIN bot_teams t ON c.team_id = t.id 
     WHERE t.owner_id = test_user_id) as conversations,
    (SELECT COUNT(*) FROM bot_messages m 
     JOIN bot_conversations c ON m.conversation_id = c.id 
     JOIN bot_teams t ON c.team_id = t.id 
     WHERE t.owner_id = test_user_id) as messages,
    (SELECT COUNT(*) FROM bot_api_keys WHERE user_id = test_user_id) as api_keys,
    (SELECT COUNT(*) FROM bot_user_activity_logs WHERE user_id = test_user_id) as activity_logs,
    (SELECT COUNT(*) FROM bot_logs l 
     JOIN bot_bots b ON l.bot_id = b.id 
     WHERE b.user_id = test_user_id) as logs,
    (SELECT COUNT(*) FROM bot_collections c 
     JOIN bot_teams t ON c.team_id = t.id 
     WHERE t.owner_id = test_user_id) as collections
  INTO counts;

  RAISE NOTICE 'Profiles: % (expected: 0)', counts.profiles;
  RAISE NOTICE 'Teams: % (expected: 0)', counts.teams;
  RAISE NOTICE 'Team Memberships: % (expected: 0)', counts.team_memberships;
  RAISE NOTICE 'Bots: % (expected: 0)', counts.bots;
  RAISE NOTICE 'Documents: % (expected: 0)', counts.documents;
  RAISE NOTICE 'Conversations: % (expected: 0)', counts.conversations;
  RAISE NOTICE 'Messages: % (expected: 0)', counts.messages;
  RAISE NOTICE 'API Keys: % (expected: 0)', counts.api_keys;
  RAISE NOTICE 'Activity Logs: % (expected: 0)', counts.activity_logs;
  RAISE NOTICE 'Logs: % (expected: 0)', counts.logs;
  RAISE NOTICE 'Collections: % (expected: 0)', counts.collections;
  RAISE NOTICE '';

  -- Check for any remaining data
  IF counts.profiles > 0 THEN
    errors := array_append(errors, 'Profile not deleted');
  END IF;
  IF counts.teams > 0 THEN
    errors := array_append(errors, 'Team not deleted');
  END IF;
  IF counts.team_memberships > 0 THEN
    errors := array_append(errors, 'Team memberships not deleted');
  END IF;
  IF counts.bots > 0 THEN
    errors := array_append(errors, 'Bots not deleted');
  END IF;
  IF counts.documents > 0 THEN
    errors := array_append(errors, 'Documents not deleted');
  END IF;
  IF counts.conversations > 0 THEN
    errors := array_append(errors, 'Conversations not deleted');
  END IF;
  IF counts.messages > 0 THEN
    errors := array_append(errors, 'Messages not deleted');
  END IF;
  IF counts.api_keys > 0 THEN
    errors := array_append(errors, 'API keys not deleted');
  END IF;
  IF counts.activity_logs > 0 THEN
    errors := array_append(errors, 'Activity logs not deleted');
  END IF;
  IF counts.logs > 0 THEN
    errors := array_append(errors, 'Logs not deleted');
  END IF;
  IF counts.collections > 0 THEN
    errors := array_append(errors, 'Collections not deleted');
  END IF;

  IF array_length(errors, 1) > 0 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '❌ CASCADE DELETION FAILED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Errors:';
    FOREACH err_msg IN ARRAY errors
    LOOP
      RAISE NOTICE '  - %', err_msg;
    END LOOP;
    RAISE EXCEPTION 'Cascade deletion test failed. See errors above.';
  ELSE
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CASCADE DELETION SUCCESSFUL!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All related data has been properly deleted.';
  END IF;
END $$;

-- Clean up temporary table
DROP TABLE IF EXISTS test_deletion_user_id;
