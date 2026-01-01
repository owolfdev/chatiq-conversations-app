"use server";

import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { processLineIntegrationEvents } from "@/lib/integrations/line/process-line-events";

function isAuthorized(request: Request): boolean {
  const secret = env.LINE_INTEGRATION_WORKER_SECRET;
  if (!secret) {
    console.warn(
      "LINE_INTEGRATION_WORKER_SECRET is not set. Denying line worker request."
    );
    return false;
  }

  const header = request.headers.get("x-line-worker-secret");
  return header !== null && header === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
      }
    );
  }

  const body = await request.json().catch(() => ({}));
  const batchSize =
    typeof body?.batchSize === "number" && body.batchSize > 0
      ? Math.min(body.batchSize, 20)
      : 5;

  const result = await processLineIntegrationEvents({
    batchSize,
    workerId: "api/integrations/line/process",
  });

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
