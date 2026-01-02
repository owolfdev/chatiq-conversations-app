Shell App Overview

What It Is
- A lightweight conversations UI that delegates data and business logic to the main app.
- Uses the same Supabase project for authentication and team context.

Key Behavior
- Renders a mobile-first conversations list and detail view.
- All /api/conversations/* calls go through the shell proxy and are forwarded to the main app.
- LINE send requests are also proxied to the main app.
- The shell has minimal local data logic; list data is fetched from the main app API.

Proxy Flow
- Client calls /api/conversations in the shell.
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
