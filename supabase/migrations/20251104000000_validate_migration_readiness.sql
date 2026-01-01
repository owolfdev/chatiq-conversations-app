-- Pre-migration validation queries
-- Run these BEFORE applying migrations to identify potential issues
-- This file is prefixed with 00000 so it runs first (if you want to use it)

DO $$
DECLARE
  issue_count bigint;
BEGIN
  IF to_regclass('public.bot_user_profiles') IS NULL THEN
    RAISE NOTICE '[migration check] Skipping users-without-profiles check (bot_user_profiles missing)';
  ELSE
    SELECT COUNT(*) INTO issue_count
    FROM auth.users u 
    LEFT JOIN bot_user_profiles p ON u.id = p.id 
    WHERE p.id IS NULL;

    RAISE NOTICE '[migration check] Users without profiles: %', issue_count;
  END IF;
END $$;

-- Check for orphaned bots (bots without valid user_id)
-- These bots will need manual team assignment
DO $$
DECLARE
  issue_count bigint;
BEGIN
  IF to_regclass('public.bot_bots') IS NULL THEN
    RAISE NOTICE '[migration check] Skipping orphaned bots check (bot_bots missing)';
  ELSE
    EXECUTE $q$
      SELECT COUNT(*)
      FROM bot_bots 
      WHERE user_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM bot_user_profiles WHERE id = bot_bots.user_id)
    $q$ INTO issue_count;
    RAISE NOTICE '[migration check] Orphaned bots (no valid user_id): %', issue_count;
  END IF;
END $$;

-- Check for orphaned documents (documents without valid bot_id or user_id)
-- These documents will need manual team assignment
DO $$
DECLARE
  issue_count bigint;
BEGIN
  IF to_regclass('public.bot_documents') IS NULL THEN
    RAISE NOTICE '[migration check] Skipping orphaned documents check (bot_documents missing)';
  ELSE
    EXECUTE $q$
      SELECT COUNT(*)
      FROM bot_documents 
      WHERE (bot_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM bot_bots WHERE id = bot_documents.bot_id))
         OR (bot_id IS NULL AND (user_id IS NULL OR NOT EXISTS (SELECT 1 FROM bot_user_profiles WHERE id = bot_documents.user_id)))
    $q$ INTO issue_count;
    RAISE NOTICE '[migration check] Orphaned documents (no valid bot_id or user_id): %', issue_count;
  END IF;
END $$;

-- Check for orphaned conversations (conversations without valid bot_id)
-- These conversations will need manual team assignment
DO $$
DECLARE
  issue_count bigint;
BEGIN
  IF to_regclass('public.bot_conversations') IS NULL THEN
    RAISE NOTICE '[migration check] Skipping orphaned conversations check (bot_conversations missing)';
  ELSE
    EXECUTE $q$
      SELECT COUNT(*)
      FROM bot_conversations 
      WHERE bot_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM bot_bots WHERE id = bot_conversations.bot_id)
    $q$ INTO issue_count;
    RAISE NOTICE '[migration check] Orphaned conversations (no valid bot_id): %', issue_count;
  END IF;
END $$;

-- Check for orphaned API keys (API keys without valid bot_id)
-- These API keys will need manual team assignment
DO $$
DECLARE
  issue_count bigint;
BEGIN
  IF to_regclass('public.bot_api_keys') IS NULL THEN
    RAISE NOTICE '[migration check] Skipping orphaned API keys check (bot_api_keys missing)';
  ELSE
    EXECUTE $q$
      SELECT COUNT(*)
      FROM bot_api_keys 
      WHERE bot_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM bot_bots WHERE id = bot_api_keys.bot_id)
    $q$ INTO issue_count;
    RAISE NOTICE '[migration check] Orphaned API keys (no valid bot_id): %', issue_count;
  END IF;
END $$;

-- Check for orphaned logs (logs without valid bot_id)
-- These logs will need manual team assignment
DO $$
DECLARE
  issue_count bigint;
BEGIN
  IF to_regclass('public.bot_logs') IS NULL THEN
    RAISE NOTICE '[migration check] Skipping orphaned logs check (bot_logs missing)';
  ELSE
    EXECUTE $q$
      SELECT COUNT(*)
      FROM bot_logs 
      WHERE bot_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM bot_bots WHERE id = bot_logs.bot_id)
    $q$ INTO issue_count;
    RAISE NOTICE '[migration check] Orphaned logs (no valid bot_id): %', issue_count;
  END IF;
END $$;

-- Summary: Check if pgvector extension is available
DO $$
DECLARE
  is_available boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') INTO is_available;
  IF is_available THEN
    RAISE NOTICE '[migration check] pgvector extension is available';
  ELSE
    RAISE NOTICE '[migration check] pgvector extension is NOT available - contact Supabase support';
  END IF;
END $$;

-- Note: This validation script is informational only
-- It does not modify any data or schema
