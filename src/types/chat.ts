export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id?: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  type: "image";
  url: string;
  alt?: string | null;
  caption?: string | null;
}
