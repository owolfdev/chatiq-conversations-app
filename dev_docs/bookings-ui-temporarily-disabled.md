# Bookings UI is temporarily OFF in this app

> **TODO — Before shipping or dogfooding bookings again:** turn bookings back on using the steps below.  
> This is intentional product pause, not a missing feature bug.

## Re-enable (one switch + verify)

1. Open **`src/lib/inbox-product-flags.ts`**.
2. Set:
   ```ts
   export const INBOX_BOOKINGS_UI_ENABLED = true;
   ```
3. Deploy / run locally and **smoke-test**:
   - **`/`** (signed in): “Open Bookings” button and **booking stats** block on the home overview (if you restore the full `HomeInboxStats` booking section — today home only shows conversation counts when the flag is off; with the flag on, re-check `src/components/home/home-inbox-stats.tsx` still matches what you want).
   - **Header nav**: Bookings (calendar) icon returns.
   - **Conversations list**: calendar shortcut on rows with booking context returns.
   - **Conversation detail**: “Open booking” / back-to-booking when `?back=/bookings/...` returns.

## What the flag gates

When `INBOX_BOOKINGS_UI_ENABLED` is **`false`**:

| Area | Hidden / disabled |
|------|-------------------|
| Marketing home `/` | “Open Bookings” CTA |
| Marketing home `/` | Homepage **booking** stats strip (and no `/api/bookings/schedule` fetch for that block) |
| `MainNav` | Link to `/bookings` |
| `MainNav` logo badge | Uses **open conversations only** (pending bookings no longer inflate the badge) |
| Conversation list item | Icon link into `/bookings` |
| Conversation `[id]` page | `bookingHref` and booking-style `backHref` not passed to the viewer |

**Not gated:** direct navigation to **`/bookings`** and **`/bookings/[id]`** — routes still exist for deep links and debugging.

## Code entry point (bookmark this path)

```
chatiq-conversations-standalone/src/lib/inbox-product-flags.ts
```

Search the repo for `INBOX_BOOKINGS_UI_ENABLED` to see every callsite.

## Related docs

- [`shell-app-overview.md`](./shell-app-overview.md) — proxy + responsibilities  
- [`shell-app-routes.md`](./shell-app-routes.md) — route map  

---

_Last updated: 2026-03-28 — align this note when booking work is prioritized again._
