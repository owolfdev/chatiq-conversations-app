import { NextResponse } from "next/server";

export function GET(request: Request) {
  if (process.env.ENABLE_TEST_ROUTES !== "true") {
    return new NextResponse(null, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? "throw";

  if (mode === "response") {
    return NextResponse.json(
      { error: "Test server error" },
      {
        status: 500,
      }
    );
  }

  throw new Error("Test 500: simulated server crash");
}
