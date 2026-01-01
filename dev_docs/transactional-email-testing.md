# Transactional email test endpoint

Use this API to trigger any app-sent transactional email for validation without hitting product flows.

Endpoint  
`POST /api/admin/test-emails`

Auth  
Requires header `x-test-email-key` matching `TEST_EMAIL_API_KEY` in your environment.

Env needed
- `TEST_EMAIL_API_KEY=<your-random-secret>` (required)
- `TEST_EMAIL_DEFAULT_TO=<default-recipient@example.com>` (optional; fallback recipient)
- `NEXT_PUBLIC_APP_URL` should be set to a non-localhost value so links resolve correctly.

Request shape
```json
{
  "type": "welcome" | "setup-guide" | "upgrade-nudge" | "team-invite" | "contact-reply",
  "email": "recipient@example.com",          // optional if TEST_EMAIL_DEFAULT_TO is set
  "payload": { /* optional overrides per type */ }
}
```

Curl examples (replace values and key)
```bash
# Welcome
curl -X POST http://localhost:3000/api/admin/test-emails \
  -H "Content-Type: application/json" \
  -H "x-test-email-key: $TEST_EMAIL_API_KEY" \
  -d '{"type":"welcome","email":"you@example.com","payload":{"userName":"Tester"}}'

# Setup guide
curl -X POST http://localhost:3000/api/admin/test-emails \
  -H "Content-Type: application/json" \
  -H "x-test-email-key: $TEST_EMAIL_API_KEY" \
  -d '{"type":"setup-guide","email":"you@example.com","payload":{"userName":"Tester","botName":"My First Bot"}}'

# Upgrade nudge
curl -X POST http://localhost:3000/api/admin/test-emails \
  -H "Content-Type: application/json" \
  -H "x-test-email-key: $TEST_EMAIL_API_KEY" \
  -d '{"type":"upgrade-nudge","email":"you@example.com","payload":{"userName":"Tester","currentPlan":"free"}}'

# Team invite
curl -X POST http://localhost:3000/api/admin/test-emails \
  -H "Content-Type: application/json" \
  -H "x-test-email-key: $TEST_EMAIL_API_KEY" \
  -d '{"type":"team-invite","email":"you@example.com","payload":{"teamName":"ChatIQ Team","inviterName":"Admin","role":"member"}}'

# Contact reply (uses inline template, no DB status update)
curl -X POST http://localhost:3000/api/admin/test-emails \
  -H "Content-Type: application/json" \
  -H "x-test-email-key: $TEST_EMAIL_API_KEY" \
  -d '{"type":"contact-reply","email":"you@example.com","payload":{"toName":"Tester","originalSubject":"Question about ChatIQ","replyText":"Thanks for reaching out!\nThis is a test reply."}}'
```

Payload overrides per type
- `welcome`: `userName`
- `setup-guide`: `userName`, `botName`
- `upgrade-nudge`: `userName`, `currentPlan`
- `team-invite`: `teamName`, `inviterName`, `inviteUrl`, `role`, `expiresAt`
- `contact-reply`: `toName`, `originalSubject`, `originalMessage`, `replyText`

Notes
- Endpoint returns JSON `{ success: true, type, to }` on success.
- Fails with 401 if the key is missing/incorrect.
- If `email` is omitted and `TEST_EMAIL_DEFAULT_TO` is not set, request is rejected.
