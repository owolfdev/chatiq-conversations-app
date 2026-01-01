# Team Resolution Helpers

This directory contains helper functions for resolving team_id for users. These are **temporary** helpers to bridge the gap until Day 7 (Nov 7) when proper team membership creation is implemented during signup.

## Files

- **`get-user-team-id.ts`** - Server-side helper (for server actions, API routes)
- **`get-user-team-id-client.ts`** - Client-side helper (for client components)

## Usage

### Server-side (Server Actions)

```typescript
import { getUserTeamId } from "@/lib/teams/get-user-team-id";

const teamId = await getUserTeamId(userId);
if (!teamId) {
  // Handle error - no team found
}
```

### Client-side (Client Components)

```typescript
import { getUserTeamIdClient } from "@/lib/teams/get-user-team-id-client";

const teamId = await getUserTeamIdClient();
if (!teamId) {
  // Handle error - no team found
}
```

## How It Works

1. **Priority 1**: Get team from `bot_team_members` (user is a member)
2. **Priority 2**: Get team from `bot_teams` where user is `owner_id`

## After Day 7

Once team membership creation is implemented during signup (Day 7), these helpers can be simplified or replaced with:
- Direct queries using `bot_team_members` (since all users will have team membership)
- Or use the RLS helper functions directly: `public.user_team_ids()`

## Migration Path

After Day 7, update code to:
1. Assume all users have team membership
2. Use `bot_team_members` directly for team resolution
3. Remove these temporary helpers or simplify them

