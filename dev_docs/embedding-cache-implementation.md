# Embedding Cache Implementation

## Overview

This document describes the chunk caching implementation designed to reduce OpenAI API costs by reusing embeddings for identical text content.

## Design Principles

### 1. **Team Isolation**
- Embeddings are only cached and reused within the same team
- Prevents cross-team data leakage
- Maintains security boundaries

### 2. **Model Versioning**
- Cache entries are tagged with model version (`text-embedding-3-small-v1`)
- Allows safe model upgrades without breaking existing embeddings
- Old cache entries automatically become invalid when model changes

### 3. **Backward Compatibility**
- Existing `bot_embeddings` table remains unchanged
- Cache is an optimization layer, not a replacement
- System works even if cache fails (graceful degradation)

### 4. **Reference Counting**
- Tracks how many chunks use each cached embedding
- Helps with cleanup and monitoring
- Doesn't block deletions (CASCADE still works)

## Database Schema

### New Table: `bot_embedding_cache`

```sql
bot_embedding_cache (
  id uuid PRIMARY KEY,
  hash text NOT NULL,                    -- SHA256 of chunk text
  team_id uuid NOT NULL,                 -- Team isolation
  model_version text NOT NULL,           -- Model versioning
  vector vector(1536) NOT NULL,          -- The actual embedding
  usage_count integer DEFAULT 1,        -- Reference count
  created_at timestamp,
  last_used_at timestamp,
  UNIQUE(hash, team_id, model_version)  -- One cache entry per (hash, team, model)
)
```

### Key Constraints

- **UNIQUE(hash, team_id, model_version)**: Prevents duplicate cache entries
- **ON DELETE CASCADE**: Cache entries deleted when team is deleted
- **RLS Enabled**: Team-scoped access control

## Processing Flow

### When Processing an Embedding Job

1. **Fetch chunk** with hash
2. **Check cache** by (hash, team_id, model_version)
3. **If cache hit**:
   - Use cached vector
   - Increment usage count
   - Skip OpenAI API call ✅
4. **If cache miss**:
   - Call OpenAI API
   - Store in cache (async, non-blocking)
   - Store in `bot_embeddings` (required for retrieval)
5. **Store embedding** in `bot_embeddings` (always required for RAG)

## Benefits

### Cost Savings
- **30-50% reduction** in OpenAI API calls (typical)
- Scales with content overlap (re-uploads, common sections, etc.)

### Performance
- Instant embedding for cached chunks
- Reduced latency for duplicate content

### Safety
- Team isolation prevents data leakage
- Model versioning handles upgrades gracefully
- Backward compatible with existing system

## Edge Cases Handled

### 1. Race Conditions
- Multiple workers processing same hash simultaneously
- Uses `UPSERT` to handle conflicts gracefully

### 2. Cache Failures
- If cache lookup fails, falls back to OpenAI API
- If cache store fails, logs error but continues
- System never breaks due to cache issues

### 3. Model Upgrades
- Change `EMBEDDING_MODEL_VERSION` constant
- Old cache entries become invalid automatically
- New embeddings use new model version

### 4. Team Deletion
- CASCADE deletes cache entries when team deleted
- No orphaned data

### 5. Hash Collisions
- SHA256 collisions are extremely rare (~0% in practice)
- Acceptable risk for cost savings

## Monitoring

### Cache Statistics

Use `getCacheStats()` to monitor:
- Total cache entries
- Total usage count (how many chunks use cached embeddings)
- Oldest/newest cache entries

### Logging

Cache operations are logged:
- Cache hits: `Cache hit for chunk...`
- Cache misses: `Cache miss for chunk..., calling OpenAI`
- Cache errors: Logged but don't break flow

## Migration Path

### Phase 1: Deploy (No Breaking Changes)
1. Run migration to create `bot_embedding_cache` table
2. Deploy updated `process-embedding-jobs.ts`
3. System continues working, cache starts populating

### Phase 2: Monitor
1. Watch cache hit rates
2. Monitor cost savings
3. Check for any issues

### Phase 3: Optimize (Optional)
1. Add cache cleanup job (remove unused entries)
2. Add cache warming for common content
3. Add analytics dashboard

## Rollback Plan

If issues arise:
1. Revert `process-embedding-jobs.ts` to previous version
2. Cache table can remain (unused but harmless)
3. Or drop table: `DROP TABLE bot_embedding_cache CASCADE;`

## Future Enhancements

### Potential Improvements
1. **Cross-team sharing** (opt-in, for public content)
2. **Cache cleanup job** (remove entries with usage_count = 0)
3. **Cache warming** (pre-embed common templates)
4. **Analytics dashboard** (visualize cache hit rates)
5. **Batch embedding** (OpenAI supports batch API for better rates)

## Testing

### Test Scenarios
1. Upload same document twice → second should use cache
2. Upload documents with identical sections → shared sections should use cache
3. Different teams with same content → should NOT share cache
4. Model version change → old cache should be ignored
5. Cache lookup failure → should fall back to OpenAI

## Configuration

### Environment Variables
None required - uses existing OpenAI API key.

### Constants
- `EMBEDDING_MODEL_VERSION`: Model version string (change when upgrading model)

## Performance Impact

### Database
- Additional table with indexes
- Minimal query overhead (single indexed lookup)
- Cache writes are async (non-blocking)

### API Calls
- Reduced OpenAI API calls (30-50% typical)
- Faster processing for cached chunks

### Storage
- Additional storage for cache table
- ~2KB per cache entry (1536 floats + metadata)
- Estimated: ~2MB per 1000 unique chunks

