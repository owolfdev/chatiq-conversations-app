import { NextResponse } from "next/server";
import { getMainAppUrl } from "@/lib/main-app-url";
import { createClient } from "@/utils/supabase/server";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
]);

export async function proxyToMainApp(req: Request, path: string) {
  const url = new URL(req.url);
  const targetUrl = `${getMainAppUrl()}${path}${url.search}`;

  const headers = new Headers(req.headers);
  HOP_BY_HOP_HEADERS.forEach((name) => headers.delete(name));

  const method = req.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer();

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const hasSessionToken = Boolean(session?.access_token);
  if (session?.access_token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetch(targetUrl, {
    method,
    headers,
    body: body ? body : undefined,
  });

  const proxyHeaders = new Headers(response.headers);
  // Avoid decoding issues when the upstream response was already decompressed.
  proxyHeaders.delete("content-encoding");
  proxyHeaders.delete("content-length");
  if (process.env.NODE_ENV !== "production") {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookieNames = cookieHeader
      .split(";")
      .map((part) => part.trim().split("=")[0])
      .filter(Boolean)
    const authCookieName = cookieNames.find((name) =>
      name.startsWith("sb-") && name.endsWith("-auth-token")
    );

    proxyHeaders.set("x-main-has-cookie", cookieHeader ? "true" : "false");
    proxyHeaders.set("x-main-cookie-size", String(cookieHeader.length));
    proxyHeaders.set("x-main-target", targetUrl);
    proxyHeaders.set("x-main-cookie-names", cookieNames.join(","));
    proxyHeaders.set("x-main-has-auth-cookie", authCookieName ? "true" : "false");
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: proxyHeaders,
  });
}
