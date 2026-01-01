// src/app/api/test-headers/route.ts
// API route to test headers (works better with ModHeader than server components)

import { NextRequest, NextResponse } from "next/server";
import { detectCountryFromHeaders, detectCurrencyFromHeaders } from "@/lib/geo/currency";

export async function GET(request: NextRequest) {
  // Get all headers
  const vercelCountry = request.headers.get("x-vercel-ip-country");
  const cloudflareCountry = request.headers.get("cf-ipcountry");
  
  // Get all headers for debugging
  const allHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    allHeaders[key] = value;
  });
  
  // Detect country and currency
  const detectedCountry = detectCountryFromHeaders(request.headers);
  const detectedCurrency = detectCurrencyFromHeaders(request.headers);
  
  return NextResponse.json({
    detected: {
      country: detectedCountry,
      currency: detectedCurrency,
    },
    headers: {
      "x-vercel-ip-country": vercelCountry,
      "cf-ipcountry": cloudflareCountry,
    },
    allHeaders,
    note: "This API route should work better with ModHeader than server components",
  });
}

