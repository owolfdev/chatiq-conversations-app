# Testing 500 Errors

This project includes a gated test route for simulating server-side 500 errors.

## Enable test routes

Set the following environment variable:

```
ENABLE_TEST_ROUTES=true
```

Keep this unset or set to any value other than `true` in production.

## URLs

- Unhandled server error (real 500):
  - `/__test/500?mode=throw`
- Explicit 500 response with JSON body:
  - `/__test/500?mode=response`
- Branded 500 page (throws during render):
  - `/__test/500-page`

If `ENABLE_TEST_ROUTES` is not exactly `true`, these routes return 404.
