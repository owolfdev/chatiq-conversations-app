# Analytics Data

This project tracks chat activity with raw events plus daily rollups.

## Tables

- `analytics_events`
  - Raw events from chat activity (`conversation_started`, `message_user`, `message_bot`).
  - Suggested retention: 90 days.
- `analytics_daily_rollups`
  - Aggregated daily metrics per team and per bot.
  - Keep long-term for historical charts.

## Event ingestion

Events are recorded when chats are saved in `src/lib/chat/save-chat.ts`.

## Rollups

A simple server action exists to backfill daily rollups:

- `src/app/actions/analytics/run-analytics-rollup.ts`

Example usage in a server-only context:

```ts
await runAnalyticsRollup({
  teamId,
  startDate: "2025-01-01",
  endDate: "2025-01-31",
});
```

For production, schedule this action daily (e.g., a cron or background job) to keep rollups current.
