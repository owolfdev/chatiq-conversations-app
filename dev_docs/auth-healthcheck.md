# Auth Healthcheck

The standalone app proxies the main app healthcheck so you can validate
end-to-end auth from `chat.chatiq.io`.

## Endpoint

- `GET /api/auth/health`

## Expected Responses

- `200 OK`
  - `{ "ok": true, "userId": "...", "email": "...", "teamId": "..." }`
- `401 Unauthorized`
  - `{ "ok": false }`

## Usage

```
curl -i https://chat.chatiq.io/api/auth/health
```

This calls the main app health endpoint and returns the same JSON response.
