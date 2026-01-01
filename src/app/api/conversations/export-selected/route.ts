import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

type ExportPayload = {
  format?: "csv" | "json";
  conversationIds?: string[];
};

type ExportConversationRow = {
  id: string;
  title: string | null;
  created_at: string;
  bot_id: string;
  team_id: string;
  bot_bots: {
    id: string;
    name: string;
    slug: string;
  }[];
};

function formatAsCSV(
  data: Array<{
    conversation_id: string;
    bot_name: string;
    bot_slug: string;
    title: string | null;
    created_at: string;
    message_count: number;
    messages: Array<{ sender: string; content: string; created_at: string }>;
  }>
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

function formatAsJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: ExportPayload = {};
  try {
    payload = (await req.json()) as ExportPayload;
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const format = payload.format === "csv" ? "csv" : "json";
  const conversationIds = payload.conversationIds ?? [];
  if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
    return NextResponse.json(
      { error: "conversationIds required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: conversations, error: convoError } = await admin
    .from("bot_conversations")
    .select("id, title, created_at, bot_id, team_id, bot_bots!inner(id, name, slug)")
    .in("id", conversationIds);

  if (convoError || !conversations) {
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }

  if (conversations.length !== conversationIds.length) {
    return NextResponse.json(
      { error: "One or more conversations not found" },
      { status: 404 }
    );
  }

  const rows = conversations as ExportConversationRow[];
  const teamIds = Array.from(
    new Set(rows.map((row) => row.team_id).filter(Boolean))
  ) as string[];

  if (teamIds.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data: memberships } = await supabase
    .from("bot_team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .in("team_id", teamIds);

  const { data: ownedTeams } = await supabase
    .from("bot_teams")
    .select("id")
    .eq("owner_id", user.id)
    .in("id", teamIds);

  const allowedTeamIds = new Set<string>([
    ...(memberships?.map((row) => row.team_id) ?? []),
    ...(ownedTeams?.map((row) => row.id) ?? []),
  ]);

  const hasAccess = teamIds.every((teamId) => allowedTeamIds.has(teamId));
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: messages, error: messagesError } = await admin
    .from("bot_messages")
    .select("conversation_id, sender, content, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }

  const messagesByConversation = new Map<
    string,
    Array<{ sender: string; content: string; created_at: string }>
  >();

  for (const message of messages ?? []) {
    const convId = message.conversation_id;
    if (!messagesByConversation.has(convId)) {
      messagesByConversation.set(convId, []);
    }
    messagesByConversation.get(convId)!.push({
      sender: message.sender === "bot" ? "assistant" : "user",
      content: message.content,
      created_at: message.created_at,
    });
  }

  const payloadData = rows.map((conv) => {
    const bot = Array.isArray(conv.bot_bots) ? conv.bot_bots[0] : conv.bot_bots;
    const convMessages = messagesByConversation.get(conv.id) ?? [];
    return {
      conversation_id: conv.id,
      bot_name: bot?.name || "Unknown",
      bot_slug: bot?.slug || "unknown",
      title: conv.title,
      created_at: conv.created_at,
      message_count: convMessages.length,
      messages: convMessages,
    };
  });

  const content = format === "csv" ? formatAsCSV(payloadData) : formatAsJSON(payloadData);
  const contentType = format === "csv" ? "text/csv" : "application/json";
  const extension = format === "csv" ? "csv" : "json";

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `conversations-selected-${timestamp}.${extension}`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
