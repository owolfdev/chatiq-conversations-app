# API Usage Guide - System Shared API Key

This guide explains how to use the **System Shared API Key** to access any public bot across all teams in your external application.

## Overview

The System Shared API Key (`sk_system_...`) is a platform-level key that allows access to **any public bot** on the platform, regardless of which team owns it. This is ideal for:
- External applications that need to display multiple public bots
- Platform admin tools
- Public-facing integrations

## Authentication

Include your system shared API key in the `Authorization` header:

```http
Authorization: Bearer sk_system_YOUR_KEY_HERE
```

## Base URL

**Production:**
```
https://www.chatiq.io/api/chat
```

**Development:**
```
http://localhost:3000/api/chat
```

## Request Format

### POST `/api/chat`

#### Headers

```http
Content-Type: application/json
Authorization: Bearer sk_system_YOUR_KEY_HERE
Accept: application/json  # For JSON responses
# OR
Accept: text/event-stream  # For streaming responses
```

#### Request Body (JSON Mode)

```json
{
  "message": "Your message here",
  "bot_slug": "public-bot-slug",
  "stream": false,
  "conversation_id": null,
  "history": [],
  "private_mode": false
}
```

#### Request Body (Streaming Mode)

```json
{
  "message": "Your message here",
  "bot_slug": "public-bot-slug",
  "stream": true,
  "conversation_id": null,
  "history": []
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | ✅ Yes | The user's message to send to the bot |
| `bot_slug` | string | ✅ Yes | The slug of the public bot to chat with |
| `stream` | boolean | No | `false` for JSON response, `true` for streaming (default: `true`) |
| `conversation_id` | string \| null | No | Conversation ID for context continuity (null for new conversation) |
| `history` | array | No | Previous messages for context (max 10 messages) |
| `private_mode` | boolean | No | If `true`, don't save conversation to database (default: `false`) |

**Important:** `bot_slug` is **required** when using a system shared API key.

## Response Format

### JSON Response (stream: false)

**Success:**
```json
{
  "response": "Bot's response text here",
  "conversationId": "uuid-here",
  "input": "Your original message"
}
```

**Quota Exceeded:**
```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Quota exceeded for messagesMonthly",
    "details": {
      "resource": "messagesMonthly",
      "limit": 100,
      "used": 286,
      "remaining": 0
    }
  }
}
```

**Service Unavailable (Public User View):**
```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "This chatbot is temporarily unavailable. Please try again later."
  }
}
```

**Invalid Bot:**
```json
{
  "error": {
    "code": "BOT_NOT_FOUND",
    "message": "Bot not found"
  }
}
```

### Streaming Response (stream: true)

Returns Server-Sent Events (SSE) format:

```
data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":" there"}}]}

data: {"conversationId":"uuid-here"}

data: [DONE]
```

## Code Examples

### JavaScript/TypeScript (Fetch API)

#### JSON Mode

```javascript
async function chatWithBot(message, botSlug, apiKey) {
  const response = await fetch('https://www.chatiq.io/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      message: message,
      bot_slug: botSlug,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Request failed');
  }

  const data = await response.json();
  return {
    response: data.response,
    conversationId: data.conversationId,
    input: data.input,
  };
}

// Usage
try {
  const result = await chatWithBot(
    'Hello!',
    'default-bot',
    'sk_system_YOUR_KEY'
  );
  console.log('Bot response:', result.response);
  console.log('Your input:', result.input);
} catch (error) {
  console.error('Error:', error.message);
}
```

#### Streaming Mode

```javascript
async function chatWithBotStream(message, botSlug, apiKey, onChunk) {
  const response = await fetch('https://www.chatiq.io/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      message: message,
      bot_slug: botSlug,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Request failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullResponse = '';
  let conversationId = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return { response: fullResponse, conversationId };
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed.choices?.[0]?.delta?.content) {
            const chunk = parsed.choices[0].delta.content;
            fullResponse += chunk;
            onChunk?.(chunk);
          }
          if (parsed.conversationId) {
            conversationId = parsed.conversationId;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  return { response: fullResponse, conversationId };
}

// Usage
let fullText = '';
await chatWithBotStream(
  'Tell me a story',
  'default-bot',
  'sk_system_YOUR_KEY',
  (chunk) => {
    fullText += chunk;
    console.log('Chunk:', chunk);
  }
);
console.log('Full response:', fullText);
```

### Python

```python
import requests
import json

def chat_with_bot(message, bot_slug, api_key, stream=False):
    url = "https://www.chatiq.io/api/chat"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    
    if stream:
        headers["Accept"] = "text/event-stream"
    
    payload = {
        "message": message,
        "bot_slug": bot_slug,
        "stream": stream,
    }
    
    response = requests.post(url, headers=headers, json=payload, stream=stream)
    
    if not response.ok:
        error = response.json()
        raise Exception(error.get("error", {}).get("message", "Request failed"))
    
    if stream:
        # Handle streaming response
        full_response = ""
        for line in response.iter_lines():
            if line.startswith(b"data: "):
                data = line[6:].decode()
                if data == "[DONE]":
                    break
                try:
                    parsed = json.loads(data)
                    if "choices" in parsed:
                        chunk = parsed["choices"][0]["delta"].get("content", "")
                        full_response += chunk
                        print(chunk, end="", flush=True)
                except:
                    pass
        return {"response": full_response}
    else:
        return response.json()

# Usage
result = chat_with_bot(
    "Hello!",
    "default-bot",
    "sk_system_YOUR_KEY",
    stream=False
)
print(f"Response: {result['response']}")
print(f"Input: {result['input']}")
```

### cURL

#### JSON Mode

```bash
curl -X POST https://www.chatiq.io/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_system_YOUR_KEY" \
  -d '{
    "message": "Hello!",
    "bot_slug": "default-bot",
    "stream": false
  }'
```

#### Streaming Mode

```bash
curl -X POST https://www.chatiq.io/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_system_YOUR_KEY" \
  -H "Accept: text/event-stream" \
  -d '{
    "message": "Hello!",
    "bot_slug": "default-bot",
    "stream": true
  }'
```

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | Success | Request successful |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Invalid or missing API key |
| 402 | Payment Required | Quota exceeded |
| 403 | Forbidden | Bot is not public or inactive |
| 404 | Not Found | Bot not found |
| 500 | Server Error | Internal server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Response Format

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error-specific details
    }
  }
}
```

## Important Notes

### 1. Bot Must Be Public

The system shared key can **only** access bots where:
- `is_public = true`
- `status = 'active'`

Private bots will return "Bot not found" (for security).

### 2. Quota Tracking

- Each bot's quota is tracked **separately** against the bot owner's team
- If Bot A's owner is over quota, you can still use Bot B (if Bot B's owner has quota)
- Quota is checked **before** calling the OpenAI API
- Pre-configured responses don't count against quota

### 3. Conversation Continuity

To maintain conversation context, pass the `conversationId` from previous responses:

```javascript
let conversationId = null;

// First message
const result1 = await chatWithBot('Hello', 'bot-slug', apiKey);
conversationId = result1.conversationId;

// Follow-up message (maintains context)
const result2 = await chatWithBot(
  'Tell me more',
  'bot-slug',
  apiKey,
  conversationId
);
```

### 4. Rate Limiting

- System shared keys use the bot owner's plan limits
- Rate limits are per bot owner's team
- IP-based rate limiting may also apply

### 5. Pre-configured Responses

Some messages (like "hi", "hello", "thanks") may match pre-configured responses and return instantly without calling the LLM. These:
- Are instant (<5ms)
- Don't count against quota
- Still save to conversation history

## Security Best Practices

1. **Never expose your API key in client-side code**
   - Use a backend proxy/server to make API calls
   - Store keys in environment variables

2. **Use HTTPS in production**
   - Always use `https://www.chatiq.io` in production
   - Never send API keys over unencrypted connections

3. **Rotate keys regularly**
   - Create new keys periodically
   - Revoke old keys when no longer needed

4. **Monitor usage**
   - Track API calls and responses
   - Set up alerts for unusual activity

## Example: Full Integration

```javascript
class ChatIQClient {
  constructor(apiKey, botSlug) {
    this.apiKey = apiKey;
    this.botSlug = botSlug;
    this.baseUrl = 'https://www.chatiq.io/api/chat';
    this.conversationId = null;
  }

  async sendMessage(message, options = {}) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        message,
        bot_slug: this.botSlug,
        stream: false,
        conversation_id: this.conversationId,
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Request failed');
    }

    const data = await response.json();
    this.conversationId = data.conversationId;
    return data;
  }
}

// Usage
const client = new ChatIQClient('sk_system_YOUR_KEY', 'default-bot');

try {
  const result = await client.sendMessage('Hello!');
  console.log('Bot:', result.response);
  console.log('You said:', result.input);
  
  const followUp = await client.sendMessage('Tell me more');
  console.log('Bot:', followUp.response);
} catch (error) {
  console.error('Error:', error.message);
}
```

## Support

For issues or questions:
- Check the main API documentation: `/docs/api`
- Review error messages for specific guidance
- Contact support if you encounter persistent issues
