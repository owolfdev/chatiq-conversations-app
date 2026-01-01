import { notFound } from "next/navigation";

// Prevent static generation - this page intentionally throws an error
export const dynamic = "force-dynamic";

export default function Test500Page() {
  if (process.env.ENABLE_TEST_ROUTES !== "true") {
    notFound();
  }

  throw new Error("Test 500 page: simulated render crash");
}
