# Local Dev: Single Host

This project serves both the app and marketing site from a single hostname.

## 1) Start the dev server

From the repo:

```
npm run dev
```

## 2) Open local URL

Use the standard local URL with port 3000:

- `http://localhost:3000`

## 3) Troubleshooting

- If you see an HTTPS error:
  - Make sure the URL starts with `http://`.

- If you see `ERR_CONNECTION_REFUSED`:
  - The dev server is not running.

## Optional: Host header testing

If you need to test host logic, you can still simulate the host header:

```
curl -I -H "Host: www.localhost" http://localhost:3000/
```
