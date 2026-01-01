// src/app/dashboard/conversations/page.tsx
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conversations",
};

export default async function ConversationsPage() {
  redirect("/conversations");
}
