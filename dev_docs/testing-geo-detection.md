# Testing Geo-Detection with ModHeader

## Overview

ModHeader is a browser extension that lets you modify HTTP headers, making it perfect for testing geo-detection without needing a VPN or deploying to different locations.

## Installation

### Chrome
1. Go to [Chrome Web Store](https://chrome.google.com/webstore)
2. Search for "ModHeader"
3. Install **"ModHeader - Modify HTTP headers"** by bewisse
4. Click "Add to Chrome"

### Firefox
1. Go to [Firefox Add-ons](https://addons.mozilla.org/)
2. Search for "ModHeader"
3. Install the extension

## Setup Instructions

### Step 1: Open ModHeader
1. Click the ModHeader icon in your browser toolbar (usually looks like a puzzle piece or "MH")
2. The ModHeader panel will open

### Step 2: Add the Header
1. Click the **"Add"** button or **"+"** icon
2. In the **Name** field, enter: `x-vercel-ip-country`
3. In the **Value** field, enter: `US` (to test US location)
4. Make sure the toggle switch is **ON** (enabled)
5. The header is now active

### Step 3: Test Your Site
1. Visit your local site: `http://localhost:3000` or your deployed URL
2. Check the pricing page - should show USD prices ($29, $79)
3. Visit the test page: `http://localhost:3000/test-geo`
4. Verify the detected country is "US" and currency is "USD"

## Testing Different Locations

### Test US (USD)
- **Header Name:** `x-vercel-ip-country`
- **Header Value:** `US`
- **Expected:** USD prices ($29, $79)

### Test Thailand (THB)
- **Header Name:** `x-vercel-ip-country`
- **Header Value:** `TH`
- **Expected:** THB prices (฿699, ฿1,699)

### Test Other Countries (USD default)
- **Header Name:** `x-vercel-ip-country`
- **Header Value:** `GB`, `CA`, `AU`, etc.
- **Expected:** USD prices (default for non-Thailand)

## Saving Profiles (Optional)

ModHeader allows you to save different header configurations:

1. Click the **"Save"** or **"Profile"** button
2. Name it (e.g., "US Testing", "Thailand Testing")
3. You can quickly switch between profiles

## Verification Checklist

- [ ] ModHeader extension installed
- [ ] Header `x-vercel-ip-country` added
- [ ] Header value set to `US` or `TH`
- [ ] Toggle switch is ON
- [ ] Visit homepage - prices match expected currency
- [ ] Visit `/test-geo` - country code matches header
- [ ] Visit `/dashboard/billing` - currency selector shows correct currency

## Troubleshooting

### Header Not Working
- Make sure the toggle switch is **ON** (enabled)
- Check that the header name is exactly: `x-vercel-ip-country` (case-sensitive)
- Try refreshing the page after enabling the header
- Clear browser cache if needed

### Still Seeing Wrong Currency
- Check the `/test-geo` page to see what country is detected
- Verify the header is being sent (check browser DevTools → Network → Headers)
- Make sure you're not logged in with a team that has a saved `billing_currency`

### Local Development Issues
- ModHeader works in local development
- The header will be available in `headers()` function
- If testing locally, make sure your dev server is running

## Disabling ModHeader

When done testing:
1. Click the ModHeader icon
2. Toggle the switch to **OFF**
3. Or remove the header entirely

## Alternative: Browser DevTools

You can also test headers using browser DevTools:

1. Open DevTools (F12)
2. Go to **Network** tab
3. Right-click any request → **Edit and Resend**
4. Add header: `x-vercel-ip-country: US`
5. Send request

However, ModHeader is easier for continuous testing.

