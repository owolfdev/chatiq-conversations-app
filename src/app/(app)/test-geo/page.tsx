// src/app/test-geo/page.tsx
// Test page to verify geo-detection is working

import { headers } from "next/headers";
import {
  detectCountryFromHeaders,
  detectCurrencyFromHeaders,
} from "@/lib/geo/currency";

export default async function TestGeoPage() {
  const headersList = await headers();

  // Get all relevant headers
  const vercelCountry = headersList.get("x-vercel-ip-country");
  const cloudflareCountry = headersList.get("cf-ipcountry");
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");

  // Get ALL headers for debugging
  const allHeaders: Record<string, string> = {};
  headersList.forEach((value, key) => {
    allHeaders[key] = value;
  });

  // Detect country and currency
  const detectedCountry = detectCountryFromHeaders(headersList);
  const detectedCurrency = detectCurrencyFromHeaders(headersList);

  return (
    <div className="container mx-auto px-4 py-20 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Geo-Detection Test</h1>

      <div className="space-y-6">
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Detected Values</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <span className="font-semibold">Country Code:</span>{" "}
              <span
                className={
                  detectedCountry ? "text-emerald-500" : "text-red-500"
                }
              >
                {detectedCountry || "Not detected"}
              </span>
            </div>
            <div>
              <span className="font-semibold">Currency:</span>{" "}
              <span className="text-emerald-500 uppercase">
                {detectedCurrency}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Raw Headers</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <span className="font-semibold">x-vercel-ip-country:</span>{" "}
              <span
                className={
                  vercelCountry ? "text-emerald-500" : "text-muted-foreground"
                }
              >
                {vercelCountry || "Not present"}
              </span>
            </div>
            <div>
              <span className="font-semibold">cf-ipcountry:</span>{" "}
              <span
                className={
                  cloudflareCountry
                    ? "text-emerald-500"
                    : "text-muted-foreground"
                }
              >
                {cloudflareCountry || "Not present"}
              </span>
            </div>
            <div>
              <span className="font-semibold">x-forwarded-for:</span>{" "}
              <span className="text-muted-foreground">
                {forwardedFor || "Not present"}
              </span>
            </div>
            <div>
              <span className="font-semibold">x-real-ip:</span>{" "}
              <span className="text-muted-foreground">
                {realIp || "Not present"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">All Headers (Debug)</h2>
          <div className="max-h-96 overflow-auto">
            <pre className="text-xs font-mono bg-muted p-4 rounded">
              {JSON.stringify(allHeaders, null, 2)}
            </pre>
          </div>
        </div>

        <div className="bg-muted border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Expected Behavior</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>
              If country is{" "}
              <code className="bg-background px-1 rounded">TH</code>: Currency
              should be <code className="bg-background px-1 rounded">THB</code>
            </li>
            <li>
              If country is{" "}
              <code className="bg-background px-1 rounded">US</code> or any
              other: Currency should be{" "}
              <code className="bg-background px-1 rounded">USD</code>
            </li>
            <li>
              If no country detected: Currency defaults to{" "}
              <code className="bg-background px-1 rounded">USD</code>
            </li>
          </ul>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm font-semibold mb-2">⚠️ ModHeader Testing:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Open browser DevTools (F12) → Network tab</li>
            <li>Reload this page</li>
            <li>Click on the request to this page</li>
            <li>Check "Request Headers" section</li>
            <li>
              Look for{" "}
              <code className="bg-background px-1 rounded">
                x-vercel-ip-country: US
              </code>
            </li>
            <li>
              If header is present in Request Headers but not shown above, there
              may be a Next.js issue
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
