import type { ChatMessage } from "@/types/chat";

type SendPayload = {
  content?: string;
  message?: string;
  conversation_id?: string;
  attachments: ChatMessage["attachments"];
};

export type SendRouteConfig = {
  endpoint: string;
  payload: SendPayload;
};

export function getConversationSendRouteConfig(
  conversationSource: string | null | undefined,
  conversationId: string,
  message: string,
  attachments: ChatMessage["attachments"] = []
): SendRouteConfig {
  const source = conversationSource?.toLowerCase();

  if (source === "line") {
    return {
      endpoint: "/api/integrations/line/send",
      payload: {
        conversation_id: conversationId,
        message,
        attachments,
      },
    };
  }

  if (source === "instagram") {
    return {
      endpoint: "/api/integrations/instagram/send",
      payload: {
        conversation_id: conversationId,
        message,
        attachments,
      },
    };
  }

  if (source === "whatsapp" || source === "facebook") {
    return {
      endpoint: "/api/integrations/twilio/send",
      payload: {
        conversation_id: conversationId,
        message,
        attachments,
      },
    };
  }

  return {
    endpoint: `/api/conversations/${conversationId}/messages`,
    payload: {
      content: message,
      attachments,
    },
  };
}
