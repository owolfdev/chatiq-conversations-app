## Team Invitation Workflow (Item 14)

This document captures the plan for implementing the team invitation experience referenced in `docs/90-day-todo.md` item 14.

### Scope

- Allow owners/admins to invite teammates by email with a selected role.
- Track invite lifecycle (pending, accepted, cancelled, expired).
- Validate permissions end-to-end (UI + API + RLS).
- Send transactional invite emails through Supabase SMTP (currently wired to Resend).

### Proposed Schema (Supabase)

`bot_team_invites`

| Column         | Type                                                   | Notes                              |
| -------------- | ------------------------------------------------------ | ---------------------------------- |
| `id`           | uuid (PK, default `gen_random_uuid()`)                 | Invite identifier                  |
| `team_id`      | uuid (FK → `bot_teams.id` on delete cascade)           | Owning team                        |
| `email`        | text (not null)                                        | Recipient email                    |
| `role`         | text (check in `('admin','member')`, default `member`) | Role granted on acceptance         |
| `inviter_id`   | uuid (FK → `bot_user_profiles.id`)                     | User who sent the invite           |
| `token`        | text (unique, not null)                                | Secure random token for acceptance |
| `expires_at`   | timestamptz (default `now() + interval '7 days'`)      | Invite expiry window               |
| `accepted_at`  | timestamptz                                            | Set upon acceptance                |
| `cancelled_at` | timestamptz                                            | Set if invite revoked              |
| `metadata`     | jsonb                                                  | Store name hints, message, etc.    |
| `created_at`   | timestamptz default now()                              | Audit                              |

Constraints:

- Unique pending invite per (`team_id`,`email`) where `accepted_at IS NULL AND cancelled_at IS NULL AND expires_at > now()`.
- Trigger to automatically mark expired invites (optional future enhancement).

RLS highlights:

- Owners/Admins can `SELECT/INSERT/UPDATE` invites for their team.
- Members have no access.
- Acceptance endpoint runs as service role to validate token and create `bot_team_members` row atomically.

### API Endpoints (Next.js App Router)

- `POST /api/team/invites` – create invite (requires owner/admin). Validates email, role, no duplicate pending invite, inserts row, sends email.
- `GET /api/team/invites` – list pending invites for current team (owner/admin view in dashboard).
- `DELETE /api/team/invites/:id` – cancel invite (soft delete via `cancelled_at`).
- `POST /api/team/invites/accept` – public endpoint that takes `{ token, name?, password? }`, verifies invite, creates user/team membership, logs audit, marks `accepted_at`.

### UI Flow (`/dashboard/team`)

1. Replace mock data with server data:
   - `Team members` section: fetch from `bot_team_members` joined with profiles.
   - `Pending invites` section: fetch from `bot_team_invites`.
2. Invite form:
   - Email + role select (admin/member).
   - Client-side validation + optimistic row appended to pending list.
   - Surface errors (duplicate, invalid email, permission).
3. Pending list actions:
   - Resend invite → calls `POST /api/team/invites/:id/resend`.
   - Cancel invite → soft delete (sets `cancelled_at`).
4. Acceptance:
   - Use `/invite/:token` public page (new route) to collect basic info, call accept API, redirect to dashboard.

### Email

- Render via lightweight template (React Email or string) containing:
  - Team name, inviter name.
  - CTA link `https://app-domain.com/invite/<token>`.
  - Expiration notice.
- Send using Supabase SMTP (configured for Resend) via `supabase.functions.invoke('send_email', ...)` or direct SMTP if already available.

### Audit & Logging

- Log invite creation/cancellation/acceptance to `bot_audit_log` (`resource_type = 'team_invite'`).
- Optionally log invite acceptance to `bot_user_activity_logs`.

### Next Steps

1. Add migration for `bot_team_invites` (+ indexes & RLS).
2. Implement server helpers (create invite, list invites, cancel invite, accept invite).
3. Update dashboard UI to consume the new APIs.
4. Add `/invite/[token]` route + acceptance form.
5. Wire email template + send path.
6. Tests covering:
   - Schema constraints (duplicate invites).
   - API permission checks.
   - Successful invite acceptance flow.

---

## Team Selection & Membership Visibility Plan

### Goals

- Allow users to switch between their personal workspace and any teams they've joined.
- Make it obvious which team context they are viewing.
- (Optional) Surface personal vs. team assets side-by-side for bots/documents.

### Switcher UX

- **Placement**: top-right user nav or dashboard header (near profile avatar).
- **Display**: current team name; dropdown list of:
  - Personal Workspace (owner of auto-created team).
  - Joined teams (from `bot_team_members` × `bot_teams`).
- **Actions**: clicking a team changes the active context and closes dropdown; optionally include role badge (`Owner/Admin/Member`).
- **Empty State**: if user only has one team (their own), show label but disable dropdown.

### Data Plumbing

- Store selected team in a client cookie (e.g., `active_team_id`) so both server and client components can read it.
- Update `getUserTeamId` and `getUserTeamIdClient` to:
  1. Check cookie; ensure user belongs to that team before trusting it.
  2. Fallback to “most recent membership” if no cookie or cookie invalid.
- Provide helper to list all teams for the switcher (server action hitting `bot_team_members` joined with `bot_teams` + role).
- Consider small TTL (e.g., 7 days) to re-evaluate membership if removed from a team.

### Page Behavior

Once the active team is resolved, existing filters continue to work—bots/docs/analytics already query by `team_id`. After switch:

- Refresh dashboard data (bots, docs, analytics, billing, etc.) to reflect the new team.
- Keep invite/billing pages restricted to admins/owners; members still see the rest.

### Optional: Dual Lists

- In addition to the switcher, bots and documents pages can render two sections:
  - `Team Bots/Documents` (active team_id).
  - `Personal Bots/Documents` (user's default team).
- Use tabs or headings with a divider for clarity; each section handles its own empty state.
- Requires fetching both team IDs per page (active + personal).

### Implementation Steps

1. Create server action `listUserTeams` returning `{ teamId, name, role, isPersonal }[]`.
2. Add `TeamSwitcher` component to dashboard header; read/write cookie via server action.
3. Update `getUserTeamId` helpers to honor cookie before falling back.
4. Ensure all server actions that need team context call the updated helper (most already do).
5. (Optional) Update `/dashboard/bots` and `/dashboard/documents` to include personal sections if desired.
