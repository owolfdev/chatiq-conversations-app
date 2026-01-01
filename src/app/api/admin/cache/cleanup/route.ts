// src/app/api/admin/cache/cleanup/route.ts
// Admin endpoint to manually trigger cache cleanup

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  cleanupExpiredCache,
  clearExpiredCache,
} from "@/lib/chat/cache-cleanup";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("bot_user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Run cleanup
    const result = await cleanupExpiredCache();

    return NextResponse.json({
      success: true,
      deleted_count: result.deleted_count,
      oldest_expired: result.oldest_expired,
    });
  } catch (error) {
    console.error("Cache cleanup failed:", error);
    return NextResponse.json(
      {
        error: "Cache cleanup failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
