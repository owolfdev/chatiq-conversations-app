# ModHeader Troubleshooting Guide

## Issue: ModHeader Not Working with Next.js

ModHeader modifies **request headers**, but Next.js server components use `headers()` which reads from the actual HTTP request. There can be issues with how headers are passed through.

## How to Verify ModHeader is Working

### Step 1: Check Browser DevTools

1. Open **DevTools** (F12)
2. Go to **Network** tab
3. **Enable ModHeader** with `x-vercel-ip-country: US`
4. **Reload the page**
5. Click on the request to your page
6. Look at **Request Headers** section
7. Check if `x-vercel-ip-country: US` is present

**If the header is NOT in Request Headers:**
- ModHeader is not working
- Check ModHeader toggle is ON
- Check header name is exactly: `x-vercel-ip-country` (case-sensitive)
- Try restarting browser

**If the header IS in Request Headers but not detected:**
- Next.js might not be reading it correctly
- Try the API route test instead: `/api/test-headers`

### Step 2: Test with API Route

ModHeader works better with API routes than server components:

1. Visit: `https://your-site.vercel.app/api/test-headers`
2. This should show the header if ModHeader is working
3. Check the JSON response for `detected.country` and `detected.currency`

### Step 3: Alternative Testing Methods

If ModHeader doesn't work with server components:

#### Option A: Use VPN
- Install Cloudflare WARP (free)
- Connect to US server
- Visit your site

#### Option B: Test on Different Network
- Use mobile hotspot
- Use different WiFi network
- Use friend's computer in different location

#### Option C: Use BrowserStack/GeoPeeker
- Online services that test from different locations
- No installation needed

## Common Issues

### Issue 1: Header Not Reaching Server

**Symptom:** Header shows in DevTools but not detected by code

**Solution:** 
- Next.js server components might cache headers
- Try API route instead: `/api/test-headers`
- Or use client-side detection (less ideal)

### Issue 2: Case Sensitivity

**Symptom:** Header name doesn't match

**Solution:**
- Header name must be exactly: `x-vercel-ip-country`
- Not: `X-Vercel-Ip-Country` or `x-Vercel-Ip-Country`

### Issue 3: ModHeader Not Enabled

**Symptom:** Nothing happens

**Solution:**
- Check toggle switch is ON (green/enabled)
- Check header is added (not just typed)
- Try refreshing page after enabling

## Testing Checklist

- [ ] ModHeader extension installed
- [ ] Header `x-vercel-ip-country` added
- [ ] Header value set to `US`
- [ ] Toggle switch is ON
- [ ] DevTools → Network → Request Headers shows the header
- [ ] Visit `/api/test-headers` - shows correct country
- [ ] Visit `/test-geo` - shows correct country
- [ ] Homepage shows USD prices

## If Nothing Works

1. **Use VPN instead** (Cloudflare WARP is free and easy)
2. **Test on deployed site** - Vercel automatically sets the header based on real IP
3. **Ask someone in US to test** - Real location is most reliable

