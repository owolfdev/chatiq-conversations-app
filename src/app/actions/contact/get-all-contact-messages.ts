// src/app/actions/contact/get-all-contact-messages.ts
import { createClient } from "@/utils/supabase/client";

export interface GetAllMessagesParams {
  page?: number;
  limit?: number;
}

export async function getAllContactMessages({
  page = 1,
  limit = 50,
}: GetAllMessagesParams = {}) {
  const supabase = createClient();

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await supabase
    .from("bot_contact_messages")
    .select(
      "id, name, email, company, subject, message, inquiry_type, created_at, status",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Failed to fetch all messages:", error.message);
    return { data: [], total: 0 };
  }

  return {
    data: data ?? [],
    total: count ?? 0,
  };
}
