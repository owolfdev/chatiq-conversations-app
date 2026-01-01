"use server";

import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { processEmbeddingJobs } from "@/lib/documents/process-embedding-jobs";

function isAuthorized(request: Request): boolean {
  const secret = env.EMBEDDING_WORKER_SECRET;
  if (!secret) {
    console.warn(
      "EMBEDDING_WORKER_SECRET is not set. Denying embedding job processing request."
    );
    return false;
  }

  const header = request.headers.get("x-embedding-worker-secret");
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

  const result = await processEmbeddingJobs({
    batchSize,
    workerId: "api/documents/embeddings",
  });

  return NextResponse.json({
    ok: true,
    ...result,
  });
}


