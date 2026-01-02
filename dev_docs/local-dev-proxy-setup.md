Local Dev Proxy Setup

Purpose
- The shell app proxies all /api/conversations/* requests to the main app.
- This avoids CORS and keeps the shell as a thin UI.

Requirements
- Main app running locally on http://localhost:3001 (or the URL you set).
- Shell app running locally on http://localhost:3000.
- Both apps use the same Supabase project.

Configuration
- Set NEXT_PUBLIC_MAIN_APP_URL=http://localhost:3001 in .env.local for the shell.
- Restart the shell dev server after changing .env.local.

Auth Notes
- Sign in through the shell app to set auth cookies for localhost:3000.
- The proxy forwards those cookies to the main app.

Quick Test
- In the shell browser, open /conversations and confirm data loads.
- CLI test (requires cookie; do not share values):
  curl -i "http://localhost:3000/api/conversations?limit=1" \
    --cookie "sb-<project-ref>-auth-token=<value>"

Troubleshooting
- 401 without cookies is expected.
- 401 with cookies usually means mismatched Supabase project or auth helpers.
