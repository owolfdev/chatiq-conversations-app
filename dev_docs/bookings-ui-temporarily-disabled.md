# Bookings UI is paused in the Inbox app

**Current state:** Bookings entry points and shortcuts are **intentionally hidden**. This is not a broken deploy.

When the team is ready to **treat bookings as a first-class surface again**, work through the checklist below so nothing is missed.

---

## Checklist — re-enable bookings in the Inbox shell

### 1) Product flag (required)

**File:** `src/lib/inbox-product-flags.ts`

Set:

```ts
export const INBOX_BOOKINGS_UI_ENABLED = true;
```

**What this alone turns back on:**

| Location | Behavior restored |
|----------|-------------------|
| Marketing home `/` | “Open Bookings” button (see `src/app/(site)/page.tsx`) |
| `MainNav` | Calendar icon → `/bookings` |
| `MainNav` badge | Open conversations **+** pending bookings count again |
| Conversation list rows | Calendar shortcut → `/bookings` when there is booking context (`src/components/conversations/list-item.tsx`) |
| Conversation detail | `bookingHref` + booking `backHref` passed into the viewer (`src/app/(app)/conversations/[id]/page.tsx`) |

**Find all usages:** search the repo for `INBOX_BOOKINGS_UI_ENABLED`.

---

### 2) Homepage booking stats card (optional product choice)

**Right now (flag `false`):** `src/components/home/home-inbox-stats.tsx` only loads **`/api/inbox-counts`** and shows the **conversation** summary tiles. It does **not** call **`/api/bookings/schedule`** and does **not** render a separate “Bookings” stats section on `/`.

**If you want the home page to show the four booking tiles again** (pending / upcoming / scheduled in window / needs schedule), extend `HomeInboxStats` to:

- fetch the schedule API (same query shape as `BookingsList` / default agenda window), and  
- render `BookingScheduleSummaryStrip` in **`compact`** mode (see `src/components/bookings/schedule-summary-strip.tsx`).

Use `git log -p -- src/components/home/home-inbox-stats.tsx` or an older commit from before the pause if you want a concrete reference implementation.

---

### 3) Smoke test after changes

- [ ] Signed-in `/` — bookings CTA visible if flag true  
- [ ] Header — bookings nav works  
- [ ] Conversations list — booking shortcut appears when `booking_context` exists  
- [ ] Open a thread with linked bookings — “Open booking” (or equivalent) in the viewer  
- [ ] `/bookings` and `/bookings/[id]` still load (they are **not** removed; they were only de-emphasized in the UI)

---

### 4) Backend / main app

The shell **proxies** bookings to the main ChatIQ app. Re-enabling UI here does **not** replace main-app booking readiness (workflows, permissions, etc.). Confirm the main app and ops expectations before marketing bookings again.

---

## Related docs

- [`README.md`](./README.md) — dev_docs index (links this file prominently)  
- [`shell-app-overview.md`](./shell-app-overview.md) — proxy model  
- [`shell-app-routes.md`](./shell-app-routes.md) — routes  

_Last updated: 2026-03-28_
