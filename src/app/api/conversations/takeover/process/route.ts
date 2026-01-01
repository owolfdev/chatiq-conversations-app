"use server";

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processTakeoverExpirations } from "@/lib/conversations/process-takeover-expirations";

function isAuthorized(request: Request): boolean {
  const secret = env.TAKEOVER_WORKER_SECRET;
  if (!secret) {
    console.warn(
      "TAKEOVER_WORKER_SECRET is not set. Denying takeover worker request."
    );
    return false;
  }

  const header = request.headers.get("x-takeover-worker-secret");
  return header !== null && header === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const batchSize =
    typeof body?.batchSize === "number" && body.batchSize > 0
      ? Math.min(body.batchSize, 50)
      : 20;

  const result = await processTakeoverExpirations({
    batchSize,
    workerId: "api/conversations/takeover/process",
  });

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
