If you’re building Next.js apps professionally (especially App Router), the “most important patterns” are mostly about **boundaries**: where code runs, where data lives, where trust is established, and how you keep pages fast and predictable.

## 1) Server-first rendering boundary

Default to Server Components for pages/layouts and “data work.” Push client code to the edges.

- Server: fetching, auth checks, permissions, DB reads/writes, secure tokens
- Client: interactivity, local UI state, rich inputs

## 2) Route-as-composition pattern

Use App Router to structure the product, not just URLs.

- layouts as persistent shells
- nested routes for “product areas”
- route groups to separate concerns (marketing vs app)
- parallel/intercepting routes for modals and multi-pane flows

## 3) Data access layer pattern

Don’t scatter DB calls across components. Use a small set of server-only modules:

- repo/service functions like `getProjectBySlug()`, `createInvoice()`
- consistent return shapes and error handling
- centralized authorization checks

## 4) Auth + authorization boundary (RLS-style thinking)

Treat every server mutation as hostile input.

- authenticate user
- determine tenant/team
- authorize action (policy check)
- then write
  Even if you use Supabase RLS, keep an app-level check for clarity and better errors.

## 5) Server Actions as the mutation pattern

For “app UI → write to DB,” Server Actions are the clean default.

- validate input (Zod)
- enforce auth + perms
- write
- revalidate cache / redirect
  Use API routes mainly for: webhooks, external callbacks, public endpoints, or non-React clients.

## 6) Validation + schema-first forms

One schema, reused everywhere:

- client form validation (good UX)
- server action validation (security)
- DB constraints (data integrity)
  This pattern prevents “it worked in the UI but blew up on the server.”

## 7) Caching and revalidation strategy

Have an explicit plan for:

- what is static, what is dynamic
- when to use `fetch` caching vs no-store
- when to `revalidatePath` / `revalidateTag`
- what must be user-specific (never cached globally)

## 8) Error, loading, and “edge states” pattern

Next gives you primitives—use them consistently:

- `loading.tsx` for skeletons
- `error.tsx` + `not-found.tsx` for boundaries
- empty states, permission denied states, offline states
  This is where “production-ready” tends to live or die.

## 9) Async work pattern (background jobs)

Anything slow/unreliable shouldn’t block the request:

- emails, PDF generation, scraping, long AI calls, video processing
  Queue it (cron/worker) and show progress in the UI. Your app feels fast even when reality isn’t.

## 10) Observability pattern

Make debugging a feature:

- structured logs (request id, user id/team id, route, timing)
- error tracking (Sentry or similar)
- audit trail for mutations (who did what, when)
  This saves you days per month.

## 11) Component contract pattern

Build a small set of reusable “domain components” with clear props and no hidden side effects.

- “dumb” UI components + “smart” server wrappers
- consistent conventions for loading, empty, and error states

## 12) Deployment and environment boundary

Treat “running in production” as a first-class target:

- runtime differences (edge vs node)
- secrets management
- migrations
- preview environments
- feature flags for risky releases

If you want a very practical way to apply this: tell me what kind of app you’re building right now (SaaS dashboard, content system, e-commerce, AI chatbot), and I’ll map these into a “default architecture” you can reuse (folders, modules, and the core flows).
