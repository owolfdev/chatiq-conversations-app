// src/app/api/conversations/[id]/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

function formatAsCSV(messages: Array<{ sender: string; content: string; created_at: string }>): string {
  const headers = ["Sender", "Content", "Created At"];
  const rows = messages.map((msg) => [
    msg.sender,
    msg.content.replace(/"/g, '""'), // Escape quotes for CSV
    msg.created_at,
  ]);

  const escapeCSV = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value}"`;
    }
    return value;
  };

  const csvRows = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ];

  return csvRows.join("\n");
}

function formatAsJSON(conversation: {
  id: string;
  title: string | null;
  bot_name: string;
  bot_slug: string;
  created_at: string;
  messages: Array<{ sender: string; content: string; created_at: string }>;
}): string {
  return JSON.stringify(conversation, null, 2);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get format from query params
    const searchParams = req.nextUrl.searchParams;
    const format = (searchParams.get("format") || "json") as "csv" | "json";

    // Fetch conversation with bot info
    const { data: conversation, error: convError } = await supabase
      .from("bot_conversations")
      .select("id, title, created_at, bot_id, bot_bots!inner(id, name, slug, team_id)")
      .eq("id", id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const bot = Array.isArray(conversation.bot_bots)
      ? conversation.bot_bots[0]
      : conversation.bot_bots;

    // Verify user has access to this conversation's team
    const { data: membership } = await supabase
      .from("bot_team_members")
      .select("team_id")
      .eq("team_id", bot?.team_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership && bot?.team_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from("bot_messages")
      .select("sender, content, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    const formattedMessages = (messages || []).map((msg) => ({
      sender: msg.sender === "bot" ? "assistant" : "user",
      content: msg.content,
      created_at: msg.created_at,
    }));

    // Format data
    const conversationData = {
      id: conversation.id,
      title: conversation.title,
      bot_name: bot?.name || "Unknown",
      bot_slug: bot?.slug || "unknown",
      created_at: conversation.created_at,
      messages: formattedMessages,
    };

    const content =
      format === "csv"
        ? formatAsCSV(formattedMessages)
        : formatAsJSON(conversationData);
    const contentType = format === "csv" ? "text/csv" : "application/json";
    const extension = format === "csv" ? "csv" : "json";

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `conversation-${id.substring(0, 8)}-${timestamp}.${extension}`;

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export conversation" },
      { status: 500 }
    );
  }
}

