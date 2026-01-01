# Team Collaboration Testing Plan

## Objectives

- Validate that both team-scoped and personal resources are visible where expected.
- Confirm that role-based permissions stay enforced (owners/admins vs members).
- Stress test the invite lifecycle (create → email send → accept → revoke) at higher volume.

## Workspace UI Scenarios

1. **Dual bot sections**

   - Switch between teams in the header switcher.
   - Visit `/dashboard/bots` and confirm the “Team workspace” list only shows bots assigned to the active team while “Personal workspace” only shows `team_id IS NULL` bots.
   - Search & sort controls should filter both sections simultaneously.

2. **Dual document sections**

   - Upload a document while on the team workspace and ensure it appears under “Team documents”.
   - Upload another document from `/dashboard/documents/new` with `team_id` cleared (personal) and ensure it appears under “Personal documents”.
   - Deleting a document from either section should only remove it from that section.

3. **Role gating checks**
   - Sign in as an owner/admin and verify that invite forms and team-name inputs are enabled.
   - Sign in as a `member` and confirm the controls are disabled with helper text (“You need admin access…”).

## Invite Stress Tests

> These steps assume you have `supabase` CLI access and configured `RESEND_API_KEY`/`INVITE_EMAIL_FROM`.

1. **Parallel invite creation**
   - Run the script below to fire off 25 concurrent invites against `/api/team/invites`.

```bash
TEAM_ID="<active-team-id>"
EMAIL_PREFIX="loadtest"
DOMAIN="example.com"
seq 1 25 | xargs -I{} -P10 curl -sS -X POST http://localhost:3000/api/team/invites \
  -H "Content-Type: application/json" \
  -b "sb:token=<session-cookie>" \
  -d "{\"email\":\"${EMAIL_PREFIX}+{}@${DOMAIN}\",\"role\":\"member\"}"
```

2. **Database validation**
   - Verify `bot_team_invites` counts:

```sql
select role, count(*)
from bot_team_invites
where team_id = '{{TEAM_ID}}'
  and accepted_at is null
  and cancelled_at is null
group by role;
```

[
{
"role": "member",
"count": 25
}
]

3. **Acceptance sweep**
   - For a subset of invites, hit `/api/team/invites/accept` with the issued token and ensure new rows land in `bot_team_members`.
   - Confirm audit rows (`bot_audit_log`) exist for each create/accept/cancel event.

## Regression Checklist

- `npx tsc --noEmit` (stays green).
- `npm run test` for the Vitest suites covering moderation/RLS/retrieval.
- Manual spot check of the dashboard header switcher → `/dashboard/bots` & `/dashboard/documents`.

_Last updated: Nov 16, 2025._
