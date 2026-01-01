# Supabase Migration Scripts

This directory contains Supabase database migration scripts for the ChatBot SaaS application.

## Migration Order

Migrations are executed in timestamp order. The current migration sequence is:

### Core Tables (Nov 4, 2025)

1. **20251104000001_enable_pgvector.sql** - Enable pgvector extension for vector similarity search
2. **20251104000002_create_teams_tables.sql** - Create `bot_teams` and `bot_team_members` tables
3. **20251104000003_create_collections_tables.sql** - Create `bot_collections` and `bot_collection_links` tables
4. **20251104000004_create_doc_chunks_and_embeddings.sql** - Create `bot_doc_chunks` and `bot_embeddings` tables with vector support
5. **20251104000005_create_audit_log.sql** - Create `bot_audit_log` table for security audit trail
6. **20251104000006_update_existing_tables_add_team_id.sql** - Add `team_id` columns to existing tables
7. **20251104000007_backfill_team_id_data.sql** - Backfill `team_id` data for existing records

### Row Level Security (Nov 5, 2025)

8. **20251105000001_create_rls_helper_functions.sql** - Create helper functions for RLS policies
9. **20251105000002_enable_rls_core_tables.sql** - Enable RLS on core tenant-scoped tables
10. **20251105000003_enable_rls_collections_and_embeddings.sql** - Enable RLS on collections and embeddings tables
11. **20251105000004_enable_rls_api_keys_and_logs.sql** - Enable RLS on API keys and logs tables
12. **20251105000005_enable_rls_messages_and_public_tables.sql** - Enable RLS on messages and user profiles

## Running Migrations

### Using Supabase CLI (Recommended for Cloud)

**Important:** Run commands from the **project root** (not from the `supabase/migrations/` directory).

#### Prerequisites

1. Install Supabase CLI if you haven't already:

   ```bash
   npm install -g supabase
   # or
   brew install supabase/tap/supabase
   ```

2. Initialize Supabase project (if not already done):

   ```bash
   # From project root
   supabase init
   ```

   This creates the `supabase/config.toml` file that the CLI needs. It will detect your existing `supabase/migrations/` directory and won't overwrite it.

3. Login to Supabase:

   ```bash
   supabase login
   ```

   This will open your browser to authenticate with your Supabase account.

4. Link to your Supabase Cloud project:

   ```bash
   # From project root
   supabase link --project-ref tuqzroqxuivyrghlgbjs
   ```

   **Finding your project ref:**

   - Go to your Supabase dashboard: https://app.supabase.com
   - Select your project
   - Look at the URL: `https://app.supabase.com/project/[project-ref]`
   - Or go to Settings → General → Reference ID

   Example:

   ```bash
   supabase link --project-ref abcdefghijklmnop
   ```

#### Apply Migrations to Cloud

```bash
# From project root (where package.json is located)
cd /Users/wolf/Documents/Development/Projects/ChatBot/chat-bot-saas

# Push all migrations to your Supabase Cloud project
supabase db push
```

The CLI will:

- Read all `.sql` files from `supabase/migrations/` in timestamp order
- Apply them to your linked Supabase Cloud project
- Show you which migrations are being applied
- Display any errors or warnings

**Note:** If you haven't linked your project yet, you can also specify the project ref directly:

```bash
supabase db push --project-ref your-project-ref --db-password your-db-password
```

#### Alternative: Using Supabase CLI with Local Development

<details>
<summary>Click to expand if you're using local Supabase (not cloud)</summary>

If you're using Supabase locally for development:

```bash
# Start local Supabase (if not already running)
supabase start

# Apply migrations to local database
supabase db reset  # This applies all migrations from scratch
# OR
supabase migration up  # Apply only new migrations
```

</details>

### Using Supabase Dashboard (Manual Method)

If you prefer to apply migrations manually through the Supabase dashboard:

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Open each migration file in order (by timestamp):
   - `20251104000001_enable_pgvector.sql`
   - `20251104000002_create_teams_tables.sql`
   - `20251104000003_create_collections_tables.sql`
   - `20251104000004_create_doc_chunks_and_embeddings.sql`
   - `20251104000005_create_audit_log.sql`
   - `20251104000006_update_existing_tables_add_team_id.sql`
   - `20251104000007_backfill_team_id_data.sql`
4. Copy and paste each file's contents into the SQL Editor
5. Click "Run" and verify it completes successfully before moving to the next one

### Manual Application via Database Connection

If you need to apply migrations directly via database connection:

1. Connect to your Supabase database using your preferred PostgreSQL client
2. Run each SQL file in order (by timestamp)
3. Verify each migration completes successfully before proceeding

## Rollback Considerations

⚠️ **Important:** These migrations modify existing production data. Before running:

1. **Backup your database** - Create a full backup before applying migrations
2. **Test in staging** - Apply migrations to a staging environment first
3. **Verify data integrity** - Check that all `team_id` values are properly backfilled

### Rollback Scripts

If you need to rollback, create reverse migration scripts that:

1. Remove `team_id` columns (if needed)
2. Drop new tables (if needed)
3. Restore previous state

**Note:** Rollback scripts are not included as they depend on your specific requirements. Create them manually if needed.

## Migration Details

### Core Tables Created

- **bot_teams** - Root tenant entity for multi-tenancy isolation
- **bot_team_members** - Team membership with role-based access control
- **bot_collections** - Document organization groups
- **bot_collection_links** - Bot-to-collection junction table
- **bot_doc_chunks** - Document chunks for RAG (~600 tokens per chunk)
- **bot_embeddings** - Vector embeddings using pgvector (1536 dimensions)
- **bot_audit_log** - Security audit trail

### Tables Updated

- **bot_bots** - Added `team_id`
- **bot_documents** - Added `team_id`, `collection_id`, `canonical_url`, `version`, `is_flagged`
- **bot_conversations** - Added `team_id`
- **bot_api_keys** - Added `team_id`
- **bot_logs** - Added `team_id`
- **bot_user_activity_logs** - Added `team_id`

## Next Steps

After applying these migrations:

1. **Day 4:** Implement Row Level Security (RLS) policies for each table
2. **Day 5:** Set up environment variables and Supabase client factories
3. **Day 6:** Implement authentication flow with team membership creation

## Important Notes

### bot_document_links vs bot_collection_links

The codebase currently uses `bot_document_links` (direct bot-to-document links), but the new architecture uses `bot_collection_links` (bot-to-collection links). Both tables can coexist:

- **bot_document_links** - Legacy table for direct bot-document relationships (kept for backward compatibility)
- **bot_collection_links** - New table for bot-collection relationships (preferred approach)

The new system uses collections as an organizational layer between bots and documents. Documents belong to collections, and bots are linked to collections.

### Migration Validation

Before running migrations in production, validate your data:

```sql
-- Check for users without profiles
SELECT COUNT(*) FROM auth.users u
LEFT JOIN bot_user_profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Check for orphaned bots (bots without valid user_id)
SELECT COUNT(*) FROM bot_bots WHERE user_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM bot_user_profiles WHERE id = bot_bots.user_id);

-- Check for orphaned documents
SELECT COUNT(*) FROM bot_documents
WHERE bot_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM bot_bots WHERE id = bot_documents.bot_id);
```

## Troubleshooting

### Common Issues

1. **pgvector extension fails to enable**

   - Ensure your Supabase project has pgvector enabled
   - Contact Supabase support if extension is not available

2. **Backfill fails for some records**

   - Check for orphaned records (records without valid `user_id` or `bot_id`)
   - Manually assign `team_id` for orphaned records
   - Consider cleaning up orphaned records before applying migrations

3. **Foreign key constraints fail**
   - Ensure parent tables exist before creating child tables
   - Verify data integrity before adding foreign key constraints

## Related Documentation

- [Technical Architecture](../docs/technical-architecture.md)
- [90-Day Todo](../docs/90-day-todo.md)
- [Security Spec](../docs/security.md)
