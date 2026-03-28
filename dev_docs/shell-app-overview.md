Shell App Overview

What It Is
- A lightweight conversations + bookings UI that delegates data and business logic to the main app.
- Uses the same Supabase project for authentication and team context.

Key Behavior
- Renders a mobile-first conversations list + detail view, plus bookings list + detail view.
- All /api/conversations/* and /api/bookings/* calls go through the shell proxy and are forwarded to the main app.
- LINE send requests are also proxied to the main app.
- The shell has minimal local data logic; list data is fetched from the main app API.

Proxy Flow
- Client calls /api/conversations or /api/bookings in the shell.
- The shell forwards the request (including cookies) to the main app.
- The main app validates the session and returns data.

Why This Design
- Single source of truth for backend behavior.
- Faster iteration in the main app without redeploying the shell.
- Avoids CORS issues by keeping client requests same-origin.

What Stays Local
- UI components and navigation.
- Basic presentation logic (filters, badges, layout).
- No local database writes for conversation data.

Bookings UI (temporary)
- **Bookings navigation and shortcuts are off** behind **`INBOX_BOOKINGS_UI_ENABLED`** (`src/lib/inbox-product-flags.ts`) so the inbox can focus on conversations.
- The signed-in **home** overview only shows **conversation** summary tiles; a separate **booking stats** block on `/` is not wired while bookings are paused (restore it when product wants it — see checklist).
- **Full re-enable instructions:** **[`bookings-ui-temporarily-disabled.md`](./bookings-ui-temporarily-disabled.md)**.
