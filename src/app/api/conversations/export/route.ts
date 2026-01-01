// src/app/api/conversations/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getConversationsForExport } from "@/app/actions/conversations/export-conversations";
import { createClient } from "@/utils/supabase/server";

function formatAsCSV(
  data: Awaited<ReturnType<typeof getConversationsForExport>>
): string {
  const headers = [
    "Conversation ID",
    "Bot Name",
    "Bot Slug",
    "Title",
    "Created At",
    "Message Count",
    "Messages (JSON)",
  ];

  const rows = data.map((conv) => {
    const messagesJson = JSON.stringify(conv.messages);
    return [
      conv.conversation_id,
      conv.bot_name,
      conv.bot_slug,
      conv.title || "",
      conv.created_at,
      conv.message_count.toString(),
      messagesJson,
    ];
  });

  // Escape CSV values
  const escapeCSV = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvRows = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ];

  return csvRows.join("\n");
}

function formatAsJSON(
  data: Awaited<ReturnType<typeof getConversationsForExport>>
): string {
  return JSON.stringify(data, null, 2);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const format = (searchParams.get("format") || "json") as "csv" | "json";
    const teamId = searchParams.get("teamId");
    const botId = searchParams.get("botId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Get active team ID if not provided
    let activeTeamId = teamId;
    if (!activeTeamId) {
      const activeTeamCookie = req.cookies.get("active_team_id");
      activeTeamId = activeTeamCookie?.value || null;
    }

    // Fetch conversations
    const data = await getConversationsForExport({
      teamId: activeTeamId,
      botId: botId || null,
      startDate: startDate || null,
      endDate: endDate || null,
      format,
    });

    // Format data
    const content = format === "csv" ? formatAsCSV(data) : formatAsJSON(data);
    const contentType = format === "csv" ? "text/csv" : "application/json";
    const extension = format === "csv" ? "csv" : "json";

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `conversations-export-${timestamp}.${extension}`;

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export conversations" },
      { status: 500 }
    );
  }
}
