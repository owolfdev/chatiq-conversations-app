# Task Prompt: Pending/Unresolved Badges (Shell App + Main App)

Use this prompt in a new workspace that has BOTH repos open.
Refer to this repo as the **shell app** and the other repo as the **main app**.

## Goal
Add indicators for open/unresolved conversations and pending/confirmed upcoming bookings.
We will keep the shell app thin by adding a small counts endpoint in the **main app** and proxying it from the **shell app**.

## Definitions / Rules
- **Open conversations**: resolution_status != "resolved" (include null).
- **Pending bookings**: status == "pending".
- **Upcoming confirmed bookings**: status == "confirmed" AND appointment_date in the future.
  - If appointment_date is null for a confirmed booking, **count it as upcoming** (assumption approved).

## UI Requirements (Shell App)
1) **App logo badge (header)**
   - Small count bubble on the app icon (top-right).
   - Count = open conversations + pending bookings.
   - Cap display at `99+`.

2) **Header dots (right of buttons)**
   - Conversations button: yellow dot if open > 0; gray dot if 0.
   - Bookings button:
     - yellow dot if pending > 0
     - else green dot if pending == 0 AND upcoming confirmed > 0
     - else gray dot

3) **Main interface badges**
   - Conversations list view: show badge "Open: X" near the search bar (OK to place in same row).
   - Bookings list view: show badges near filters row: "Pending: X" (yellow) and "Upcoming: X" (green).

4) **Polling**
   - Use existing polling cadence (8s) from list pages.
   - Header/logo indicators can be updated from the same state when list pages are open.

## Main App Changes Needed
Add a light API endpoint to expose counts for the shell app:
- Suggested route: `GET /api/inbox-counts` (or similar) in the main app.
- Response shape (example):
  ```json
  {
    "openConversations": 12,
    "pendingBookings": 4,
    "upcomingConfirmedBookings": 3
  }
  ```
- This should respect the authenticated user/team context the same way the other inbox endpoints do.

## Shell App Integration Points
- Header UI lives in: `src/components/nav/components/main-nav.tsx`.
  - App icon + label are in the left group.
  - Conversations and Bookings buttons are Links with icons.
- Conversations list UI: `src/components/conversations/list.tsx`.
- Bookings list UI: `src/components/bookings/list.tsx`.
- Existing proxy for main app APIs: `src/lib/main-app-proxy.ts` and API routes under `src/app/api/...`.
  - Add a new proxy route in shell app for the counts endpoint.

## Notes / Assumptions
- The shell app should not query Supabase directly for these counts.
- Keep styles consistent with existing badges/dots (use Tailwind classes).
- Use yellow for pending/open, green for confirmed upcoming, gray for none.

## Ask
Implement both main app endpoint and shell app UI wiring + polling integration.
