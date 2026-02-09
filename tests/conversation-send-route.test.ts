import { describe, expect, it } from "vitest";

import { getConversationSendRouteConfig } from "@/lib/conversations/send-route";
import type { ChatAttachment } from "@/types/chat";

describe("getConversationSendRouteConfig", () => {
  const conversationId = "conv-123";
  const message = "Hello from agent";
  const attachments: ChatAttachment[] = [
    { type: "image", url: "https://example.com/image.jpg" },
  ];

  it("routes LINE to LINE integration send endpoint with integration payload", () => {
    const config = getConversationSendRouteConfig(
      "line",
      conversationId,
      message,
      attachments
    );

    expect(config.endpoint).toBe("/api/integrations/line/send");
    expect(config.payload).toEqual({
      conversation_id: conversationId,
      message,
      attachments,
    });
  });

  it("routes Instagram to Instagram integration send endpoint with integration payload", () => {
    const config = getConversationSendRouteConfig(
      "instagram",
      conversationId,
      message,
      attachments
    );

    expect(config.endpoint).toBe("/api/integrations/instagram/send");
    expect(config.payload).toEqual({
      conversation_id: conversationId,
      message,
      attachments,
    });
  });

  it("routes WhatsApp to Twilio send endpoint with integration payload", () => {
    const config = getConversationSendRouteConfig(
      "whatsapp",
      conversationId,
      message,
      attachments
    );

    expect(config.endpoint).toBe("/api/integrations/twilio/send");
    expect(config.payload).toEqual({
      conversation_id: conversationId,
      message,
      attachments,
    });
  });

  it("routes Facebook to Twilio send endpoint with integration payload", () => {
    const config = getConversationSendRouteConfig(
      "facebook",
      conversationId,
      message,
      attachments
    );

    expect(config.endpoint).toBe("/api/integrations/twilio/send");
    expect(config.payload).toEqual({
      conversation_id: conversationId,
      message,
      attachments,
    });
  });

  it("routes all other sources to conversation messages endpoint with default payload", () => {
    const config = getConversationSendRouteConfig(
      "web",
      conversationId,
      message,
      attachments
    );

    expect(config.endpoint).toBe(`/api/conversations/${conversationId}/messages`);
    expect(config.payload).toEqual({
      content: message,
      attachments,
    });
  });
});
