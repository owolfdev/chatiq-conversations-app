import { NextResponse } from "next/server";
import { unsubscribeMarketingEmail } from "@/lib/email/unsubscribe";

function parseBodyParams(bodyText: string): { email?: string; token?: string } {
  const params = new URLSearchParams(bodyText);
  return {
    email: params.get("email") ?? undefined,
    token: params.get("token") ?? undefined,
  };
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  let email = url.searchParams.get("email") ?? undefined;
  let token = url.searchParams.get("token") ?? undefined;

  if (!email || !token) {
    const contentType = req.headers.get("content-type") || "";
    try {
      if (contentType.includes("application/json")) {
        const body = (await req.json()) as { email?: string; token?: string };
        email = email ?? body.email;
        token = token ?? body.token;
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const bodyText = await req.text();
        const parsed = parseBodyParams(bodyText);
        email = email ?? parsed.email;
        token = token ?? parsed.token;
      }
    } catch (error) {
      console.error("[unsubscribe] Failed to parse request body", error);
    }
  }

  if (!email || !token) {
    return NextResponse.json(
      { error: "Missing email or token." },
      { status: 400 }
    );
  }

  const result = await unsubscribeMarketingEmail({ email, token });
  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Unable to update preferences." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email") ?? undefined;
  const token = url.searchParams.get("token") ?? undefined;

  if (!email || !token) {
    return NextResponse.json(
      { error: "Missing email or token." },
      { status: 400 }
    );
  }

  const result = await unsubscribeMarketingEmail({ email, token });
  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Unable to update preferences." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
