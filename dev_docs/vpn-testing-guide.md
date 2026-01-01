# VPN Testing Guide for Geo-Detection

## Cloudflare WARP Limitation

**WARP does NOT let you choose countries** - it routes to the nearest Cloudflare server, which might still be in Thailand. You need a VPN that lets you select specific countries.

## Recommended Free VPNs for Testing

### Option 1: Proton VPN (Best Free Option)

1. **Download:** https://protonvpn.com/download
2. **Install** the app
3. **Create free account** (no credit card needed)
4. **Connect to "US-FREE"** server
5. **Visit your site** → Should show USD prices

**Pros:**

- Free tier with US servers
- No data limits (but slower speeds)
- Easy to use

### Option 2: Windscribe (Good Alternative)

1. **Download:** https://windscribe.com/
2. **Install** the app
3. **Create free account** (10GB/month free)
4. **Select "United States"** location
5. **Connect** and visit your site

**Pros:**

- 10GB free per month
- Multiple US server locations
- Good speeds

### Option 3: TunnelBear (Simple)

1. **Download:** https://www.tunnelbear.com/
2. **Install** the app
3. **Create free account** (500MB/month)
4. **Select "United States"** on the map
5. **Connect** and visit your site

**Pros:**

- Very simple interface
- Visual country selection
- Good for quick tests

## Testing Steps

1. **Install VPN** (choose one above)
2. **Connect to US server**
3. **Visit your site:** https://chatiq-git-main-owolfdevs-projects.vercel.app/
4. **Check pricing page** - should show USD prices ($29, $79)
5. **Visit test page:** `/test-geo` - should show country "US"
6. **Disconnect VPN** - should show THB prices (฿699, ฿1,699)

## Alternative: Use ModHeader (No VPN Needed)

ModHeader is actually better for testing because:

- ✅ No VPN installation needed
- ✅ Instant switching between countries
- ✅ Works in local development
- ✅ No bandwidth limits

See `docs/modheader-troubleshooting.md` for setup instructions.

## Online Testing Services (No Installation)

If you don't want to install anything:

1. **GeoPeeker:** https://geopeeker.com/

   - Enter your URL
   - Select "United States"
   - View screenshot

2. **BrowserStack:** https://www.browserstack.com/

   - Free trial available
   - Test from real US locations

3. **Geo Targetly:** https://geotargetly.com/geo-browse
   - Screenshots from different countries

## Quick Verification

After connecting to US VPN:

- ✅ Homepage shows: $29, $79 (USD)
- ✅ `/test-geo` shows: Country "US", Currency "USD"
- ✅ `/dashboard/billing` shows: Currency selector "USD"

After disconnecting:

- ✅ Homepage shows: ฿699, ฿1,699 (THB)
- ✅ `/test-geo` shows: Country "TH", Currency "THB"
