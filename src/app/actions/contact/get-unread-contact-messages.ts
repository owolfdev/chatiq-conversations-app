// src/app/actions/contact/get-unread-contact-messages.ts
import { createClient } from "@/utils/supabase/client";

interface GetUnreadMessagesParams {
  page?: number;
  limit?: number;
}

export async function getUnreadContactMessages({
  page,
  limit,
}: GetUnreadMessagesParams = {}) {
  const supabase = createClient();

  const safePage = page ?? 1;
  const safeLimit = limit ?? 10;
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  const { data, count, error } = await supabase
    .from("bot_contact_messages")
    .select(
      "id, name, email, subject, message, created_at, inquiry_type, status",
      {
        count: "exact",
      }
    )
    .eq("status", "unread")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Failed to fetch unread messages:", error.message);
    return { data: [], total: 0 };
  }

  return { data: data ?? [], total: count ?? 0 };
}
