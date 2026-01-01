-- Fix migration conflict: Remove incorrect migration records
-- The database has records for 20251202* which don't exist as migration files
-- This script removes those incorrect records so migrations can proceed normally

-- Remove any December 2025 migration records (they don't exist as files)
DELETE FROM supabase_migrations.schema_migrations 
WHERE version LIKE '202512%';

-- Verify the last migration is now 20251125000001
-- The next migration to apply should be 20251128000001_add_ip_based_rate_limiting.sql
SELECT version FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 5;

