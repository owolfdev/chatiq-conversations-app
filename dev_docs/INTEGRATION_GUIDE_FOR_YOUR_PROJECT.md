# ChatIQ API Integration Guide for Your Next.js Project

This guide is for integrating ChatIQ API into YOUR Next.js project (not the ChatIQ app itself).

## Step 1: Add Environment Variables

Add to your Next.js project's `.env.local`:

```bash
CHATIQ_API_KEY=sk_live_your_api_key_here
CHATIQ_API_URL=https://chatiq.io/api
CHATIQ_BOT_SLUG=your-bot-slug
```

## Step 2: Create Server Action

Create `src/app/actions/chatbot.ts` in YOUR project:

```typescript
"use server";

/**
 * Server action to send messages to ChatIQ API
 * This keeps the API key secure on the server side
 */

interface ChatRequest {
  message: string;
  conversation_id?: string | null;
}

interface ChatResponse {
  success: boolean;
  response?: string;
  conversationId?: string;
  error?: string;
}

export async function sendChatbotMessage(
  request: ChatRequest
): Promise<ChatResponse> {
  try {
    const apiKey = process.env.CHATIQ_API_KEY;
    const apiUrl = process.env.CHATIQ_API_URL || "https://chatiq.io/api";
    const botSlug = process.env.CHATIQ_BOT_SLUG;

    if (!apiKey) {
      return {
        success: false,
        error: "ChatIQ API key is not configured",
      };
    }

    if (!botSlug) {
      return {
        success: false,
        error: "ChatIQ bot slug is not configured",
      };
    }

    const response = await fetch(`${apiUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        message: request.message,
        bot_slug: botSlug,
        stream: false,
        conversation_id: request.conversation_id || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: "Failed to get response from ChatIQ" },
      }));
      return {
        success: false,
        error: error.error?.message || "Failed to send message",
      };
    }

    const data = await response.json();

    return {
      success: true,
      response: data.response,
      conversationId: data.conversationId,
    };
  } catch (error) {
    console.error("ChatIQ API error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
```

## Step 3: Update Your ChatbotWidget Component

Update your existing `ChatbotWidget` component. Replace the `handleSubmit` function:

**Find this in your component:**

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim() || isLoading) return;

  const userMessage = input.trim();
  setInput("");

  setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

  setIsLoading(true);

  try {
    const response = await fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
    });

    const data = await response.json();
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: data.response },
    ]);
  } catch (error) {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "Sorry, something went wrong. Please try again or contact Oliver directly.",
      },
    ]);
  } finally {
    setIsLoading(false);
  }
};
```

**Replace with this:**

```typescript
const [conversationId, setConversationId] = useState<string | null>(null);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim() || isLoading) return;

  const userMessage = input.trim();
  setInput("");

  // Add user message immediately
  setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
  setIsLoading(true);

  try {
    const result = await sendChatbotMessage({
      message: userMessage,
      conversation_id: conversationId,
    });

    if (result.success && result.response) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.response! },
      ]);

      // Update conversation ID for context
      if (result.conversationId) {
        setConversationId(result.conversationId);
      }
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            result.error ||
            "Sorry, something went wrong. Please try again or contact Oliver directly.",
        },
      ]);
    }
  } catch (error) {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "Sorry, something went wrong. Please try again or contact Oliver directly.",
      },
    ]);
  } finally {
    setIsLoading(false);
  }
};
```

**And add this import at the top:**

```typescript
import { sendChatbotMessage } from "@/app/actions/chatbot";
```

## That's it!

Your component will now use the ChatIQ API instead of your local `/api/chatbot` endpoint.

## Summary of Changes

1. ✅ Add 3 environment variables to `.env.local`
2. ✅ Create `src/app/actions/chatbot.ts` with the server action
3. ✅ Update your `ChatbotWidget` component:
   - Add `conversationId` state
   - Replace the fetch call with `sendChatbotMessage`
   - Import the server action

No other changes needed! Your UI stays exactly the same.
