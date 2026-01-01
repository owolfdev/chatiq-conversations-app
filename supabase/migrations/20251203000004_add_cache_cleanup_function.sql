-- Add function to clean up expired cache entries
-- This should be run periodically (e.g., daily) to remove stale cached responses

CREATE OR REPLACE FUNCTION cleanup_expired_response_cache()
RETURNS TABLE (
  deleted_count bigint,
  oldest_expired timestamp with time zone
) AS $$
DECLARE
  v_deleted_count bigint;
  v_oldest_expired timestamp with time zone;
BEGIN
  -- Find the oldest expired entry (for reporting)
  SELECT MIN(expires_at) INTO v_oldest_expired
  FROM bot_response_cache
  WHERE expires_at <= now();

  -- Delete all expired cache entries
  WITH deleted AS (
    DELETE FROM bot_response_cache
    WHERE expires_at <= now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  -- Return results
  RETURN QUERY SELECT v_deleted_count, v_oldest_expired;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION cleanup_expired_response_cache IS 'Cleans up expired response cache entries. Should be run periodically (daily recommended) to prevent stale cached responses as the app evolves. Returns count of deleted entries and oldest expired timestamp.';

-- Optional: Set up pg_cron job to run daily (requires pg_cron extension)
-- Uncomment if pg_cron is available in your Supabase instance
/*
SELECT cron.schedule(
  'cleanup-expired-response-cache',
  '0 2 * * *', -- Run daily at 2 AM UTC
  $$SELECT cleanup_expired_response_cache();$$
);
*/

