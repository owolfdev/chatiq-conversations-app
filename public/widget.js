/**
 * ChatIQ Universal Widget
 * A standalone JavaScript widget for embedding chatbots on any website
 *
 * Usage:
 * <script src="https://chatiq.io/widget.js"
 *         data-bot-slug="my-bot"
 *         data-api-key="sk_live_..."
 *         data-position="bottom-right"
 *         data-primary-color="#10b981"
 *         async></script>
 */

(function () {
  "use strict";

  // Configuration from script tag data attributes
  const scriptTag =
    document.currentScript || document.querySelector("script[data-bot-slug]");

  if (!scriptTag) {
    console.error("ChatIQ Widget: No script tag found");
    return;
  }

  const config = {
    botSlug: scriptTag.getAttribute("data-bot-slug"),
    apiKey: scriptTag.getAttribute("data-api-key"),
    position: scriptTag.getAttribute("data-position") || "bottom-right",
    primaryColor: scriptTag.getAttribute("data-primary-color") || "#10b981",
    size: scriptTag.getAttribute("data-size") || "medium", // small, medium, large
    apiBaseUrl:
      scriptTag.getAttribute("data-api-base-url") || "https://www.chatiq.io",
    headerTitle: scriptTag.getAttribute("data-header-title") || "Chat with us",
    sourceLabel: scriptTag.getAttribute("data-source-label") || "web",
    embedId:
      scriptTag.getAttribute("data-embed-id") ||
      scriptTag.getAttribute("data-bot-slug"),
    persistConversation:
      scriptTag.getAttribute("data-persist-conversation") === "true",
    conversationStorageKey:
      scriptTag.getAttribute("data-conversation-storage-key") || null,
  };

  if (!config.botSlug) {
    console.error("ChatIQ Widget: data-bot-slug is required");
    return;
  }

  if (!config.apiKey) {
    console.error("ChatIQ Widget: data-api-key is required");
    return;
  }

  // Widget state
  let isOpen = false;
  let messages = [];
  let conversationId = null;
  let isStreaming = false;
  let abortController = null;
  let messageIds = new Set();
  let lastSeenAt = null;
  let eventSource = null;
  let pollInterval = null;

  const storageKey =
    config.conversationStorageKey ||
    `chatiq_conversation_${config.botSlug}_${config.embedId}`;

  function readConversationId() {
    if (!config.persistConversation) return null;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored && typeof stored === "string" ? stored : null;
    } catch (error) {
      return null;
    }
  }

  function writeConversationId(nextId) {
    if (!config.persistConversation) return;
    try {
      if (nextId) {
        localStorage.setItem(storageKey, nextId);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      // Ignore storage failures (e.g., blocked in private mode)
    }
  }

  conversationId = readConversationId();

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  }

  function updateLastSeen(timestamp) {
    if (!timestamp || typeof timestamp !== "string") return;
    if (!lastSeenAt || new Date(timestamp).getTime() > new Date(lastSeenAt).getTime()) {
      lastSeenAt = timestamp;
    }
  }

  function appendMessageFromPayload(payload) {
    if (!payload) return;
    const content = payload.content;
    if (typeof content !== "string" || !content.trim()) return;
    const sender = payload.sender;
    const role = sender === "bot" ? "assistant" : sender === "user" ? "user" : null;
    if (!role) return;
    const id = typeof payload.id === "string" ? payload.id : null;
    if (id && messageIds.has(id)) return;

    const normalized = content.trim();
    const hasRecentDuplicate = messages
      .slice(-6)
      .some(
        (msg) =>
          msg.role === role &&
          typeof msg.content === "string" &&
          msg.content.trim() === normalized
      );

    if (hasRecentDuplicate) {
      if (id) {
        messageIds.add(id);
      }
      updateLastSeen(payload.created_at);
      return;
    }

    const last = messages[messages.length - 1];
    if (last && last.role === role && last.content.trim() === normalized) {
      if (id) {
        messageIds.add(id);
      }
      updateLastSeen(payload.created_at);
      return;
    }

    messages.push({ role, content });
    if (id) {
      messageIds.add(id);
    }
    updateLastSeen(payload.created_at);
    renderMessages();
    if (isOpen) {
      scrollToBottom();
    }
  }

  async function pollConversationUpdates() {
    if (!conversationId || !config.apiKey) return;
    try {
      const sinceQuery = lastSeenAt
        ? `&since=${encodeURIComponent(lastSeenAt)}`
        : "";
      const response = await fetch(
        `${config.apiBaseUrl}/api/v1/conversations/${conversationId}/messages?limit=50${sinceQuery}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
        }
      );
      if (!response.ok) return;
      const data = await response.json();
      const restored = Array.isArray(data?.messages) ? data.messages : [];
      restored.forEach(appendMessageFromPayload);
    } catch (error) {
      // Ignore polling failures
    }
  }

  function startPolling() {
    if (pollInterval) return;
    pollConversationUpdates();
    pollInterval = setInterval(pollConversationUpdates, 5000);
  }

  function startConversationStream() {
    if (!conversationId || !config.apiKey) return;
    if (eventSource) return;
    if (typeof EventSource === "undefined") {
      startPolling();
      return;
    }

    const streamUrl = `${config.apiBaseUrl}/api/v1/conversations/${conversationId}/stream?api_key=${encodeURIComponent(config.apiKey)}`;
    eventSource = new EventSource(streamUrl);
    eventSource.onmessage = (event) => {
      if (!event.data) return;
      let parsed;
      try {
        parsed = JSON.parse(event.data);
      } catch (error) {
        return;
      }
      const incoming = parsed?.message ?? parsed?.messages ?? parsed;
      if (Array.isArray(incoming)) {
        incoming.forEach(appendMessageFromPayload);
      } else if (incoming && incoming.sender) {
        appendMessageFromPayload(incoming);
      }
    };
    eventSource.onerror = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      startPolling();
    };
  }

  async function loadConversationHistory() {
    if (!conversationId) return;
    if (!config.apiKey) return;
    try {
      const response = await fetch(
        `${config.apiBaseUrl}/api/v1/conversations/${conversationId}/messages`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const restored = Array.isArray(data?.messages) ? data.messages : [];
      const mapped = restored
        .map((msg) => {
          const sender = msg?.sender;
          const content = msg?.content;
          if (typeof content !== "string" || !content.trim()) return null;
          if (sender === "bot") {
            return { role: "assistant", content };
          }
          if (sender === "user") {
            return { role: "user", content };
          }
          return null;
        })
        .filter(Boolean);

      if (mapped.length) {
        messages = mapped;
        restored.forEach((msg) => {
          if (typeof msg?.id === "string") {
            messageIds.add(msg.id);
          }
          updateLastSeen(msg?.created_at);
        });
        renderMessages();
        if (isOpen) {
          scrollToBottom();
        }
      }
      startConversationStream();
    } catch (error) {
      // Ignore fetch failures for embed resilience
    }
  }

  // Create widget container
  const widgetContainer = document.createElement("div");
  widgetContainer.id = "chatiq-widget-container";

  // Wait for body if needed
  if (!document.body) {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.appendChild(widgetContainer);
    });
  } else {
    document.body.appendChild(widgetContainer);
  }

  // Inject CSS
  const style = document.createElement("style");
  style.textContent = `
    #chatiq-widget-container {
      position: fixed;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }

    /* Prevent zoom on input focus for mobile - use 18px (Tailwind lg) */
    @media screen and (max-width: 768px) {
      #chatiq-widget-input {
        font-size: 18px !important;
      }
    }

    #chatiq-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${config.primaryColor};
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex !important;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      z-index: 1000000;
      /* Ensure button is always visible */
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    #chatiq-widget-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    #chatiq-widget-button svg {
      width: 24px;
      height: 24px;
    }

    #chatiq-widget-window {
      display: none;
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 600px;
      /* Fallback for browsers without dvh support */
      max-height: calc(100vh - 80px);
      /* Use dynamic viewport height for mobile browsers - account for top safe area */
      max-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 80px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      flex-direction: column;
      overflow: hidden;
      /* Ensure widget doesn't go above safe area on mobile */
      position: relative;
    }

    @media (max-width: 768px) {
      #chatiq-widget-window {
        /* Significantly reduce height on mobile with generous padding for address bar */
        /* Use both dvh and vh for better compatibility */
        max-height: calc(100vh - 100px);
        max-height: calc(100dvh - 100px);
        height: calc(100vh - 100px);
        height: calc(100dvh - 100px);
      }
    }

    @media (max-height: 700px) {
      #chatiq-widget-window {
        height: calc(100vh - 100px);
        height: calc(100dvh - 100px);
        max-height: calc(100vh - 100px);
        max-height: calc(100dvh - 100px);
      }
    }

    @media (max-width: 420px) {
      #chatiq-widget-window {
        width: calc(100vw - 20px);
        max-width: calc(100vw - 20px);
        /* Very generous padding on small screens to avoid address bar */
        max-height: calc(100dvh - 100px);
        height: calc(100dvh - 100px);
      }
    }

    #chatiq-widget-window.open {
      display: flex;
    }

    #chatiq-widget-header {
      background: ${config.primaryColor};
      color: white;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      z-index: 1;
      flex-shrink: 0;
      min-height: 48px;
    }

    #chatiq-widget-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding-right: 8px;
    }

    @media (max-width: 420px) {
      #chatiq-widget-header {
        padding: 10px 12px;
      }
      #chatiq-widget-header h3 {
        font-size: 14px;
      }
    }

    #chatiq-widget-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
    }

    #chatiq-widget-close:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    #chatiq-widget-close svg {
      width: 18px;
      height: 18px;
    }

    #chatiq-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #f9fafb;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
    }

    .chatiq-message {
      display: flex;
      max-width: 80%;
      animation: fadeIn 0.3s;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .chatiq-message.user {
      align-self: flex-end;
      justify-content: flex-end;
    }

    .chatiq-message.assistant {
      align-self: flex-start;
      justify-content: flex-start;
    }

    .chatiq-message-bubble {
      padding: 12px 16px;
      border-radius: 18px;
      word-wrap: break-word;
      white-space: normal;
    }

    .chatiq-message-bubble p {
      margin: 0 0 8px 0;
    }

    .chatiq-message-bubble p:last-child {
      margin-bottom: 0;
    }

    .chatiq-message-bubble ul,
    .chatiq-message-bubble ol {
      margin: 0 0 8px 18px;
      padding: 0;
    }

    .chatiq-message-bubble ul {
      list-style: disc;
    }

    .chatiq-message-bubble ol {
      list-style: decimal;
    }

    .chatiq-message-bubble li {
      margin: 0 0 4px 0;
    }

    .chatiq-message-bubble pre {
      margin: 8px 0;
      padding: 12px;
      background: #111827;
      color: #f9fafb;
      border-radius: 10px;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre;
    }

    .chatiq-message-bubble code.chatiq-inline-code {
      background: #f3f4f6;
      color: #111827;
      padding: 2px 6px;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12px;
    }

    .chatiq-message.user .chatiq-message-bubble {
      background: ${config.primaryColor};
      color: white;
      border-bottom-right-radius: 4px;
    }

    .chatiq-message.user .chatiq-message-bubble a {
      color: white;
      text-decoration: underline;
      opacity: 0.9;
    }

    .chatiq-message.user .chatiq-message-bubble a:hover {
      opacity: 1;
    }

    .chatiq-message.assistant .chatiq-message-bubble {
      background: white;
      color: #1f2937;
      border: 1px solid #e5e7eb;
      border-bottom-left-radius: 4px;
    }

    .chatiq-message.assistant .chatiq-message-bubble a {
      color: ${config.primaryColor};
      text-decoration: underline;
    }

    .chatiq-message.assistant .chatiq-message-bubble a:hover {
      text-decoration: none;
    }

    #chatiq-widget-typing {
      display: none;
      align-self: flex-start;
      padding: 12px 16px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      border-bottom-left-radius: 4px;
      max-width: 80%;
      animation: fadeIn 0.3s;
    }

    #chatiq-widget-typing.active {
      display: flex;
      gap: 4px;
    }

    .chatiq-typing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #9ca3af;
      animation: typing 1.4s infinite;
    }

    .chatiq-typing-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .chatiq-typing-dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.7; }
      30% { transform: translateY(-8px); opacity: 1; }
    }

    #chatiq-widget-input-container {
      padding: 16px;
      background: white;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    }

    #chatiq-widget-input {
      flex: 1;
      padding: 10px 16px;
      border: 1px solid #d1d5db;
      border-radius: 24px;
      font-size: 18px;
      outline: none;
      transition: border-color 0.2s;
      -webkit-appearance: none;
      -webkit-tap-highlight-color: transparent;
    }

    #chatiq-widget-input:focus {
      border-color: ${config.primaryColor};
    }

    #chatiq-widget-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${config.primaryColor};
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      flex-shrink: 0;
    }

    #chatiq-widget-send:hover:not(:disabled) {
      background: ${darkenColor(config.primaryColor, 10)};
    }

    #chatiq-widget-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    #chatiq-widget-send svg {
      width: 18px;
      height: 18px;
    }

    /* Position styles */
    ${getPositionStyles(config.position)}
  `;

  document.head.appendChild(style);

  // Helper function to darken color
  function darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) - percent));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) - percent));
    const b = Math.max(0, Math.min(255, (num & 0x0000ff) - percent));
    return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
  }

  // Get position styles based on config
  function getPositionStyles(position) {
    const positions = {
      "bottom-right": `
        #chatiq-widget-container {
          bottom: 20px;
          right: 20px;
          /* Fallback for devices that support safe-area-inset */
          bottom: max(20px, env(safe-area-inset-bottom, 20px));
          right: max(20px, env(safe-area-inset-right, 20px));
        }
        #chatiq-widget-window {
          margin-bottom: 80px;
        }
        @media (max-width: 420px) {
          #chatiq-widget-container {
            bottom: 10px;
            right: 10px;
            /* Fallback for devices that support safe-area-inset */
            bottom: max(10px, env(safe-area-inset-bottom, 10px));
            right: max(10px, env(safe-area-inset-right, 10px));
          }
          #chatiq-widget-window {
            margin-bottom: 70px;
            max-height: calc(100dvh - 100px);
          }
        }
        @media (max-height: 700px) {
          #chatiq-widget-window {
            margin-bottom: 70px;
            max-height: calc(100dvh - 100px);
          }
        }
      `,
      "bottom-left": `
        #chatiq-widget-container {
          bottom: 20px;
          left: 20px;
          /* Fallback for devices that support safe-area-inset */
          bottom: max(20px, env(safe-area-inset-bottom, 20px));
          left: max(20px, env(safe-area-inset-left, 20px));
        }
        #chatiq-widget-window {
          margin-bottom: 80px;
        }
        @media (max-width: 420px) {
          #chatiq-widget-container {
            bottom: 10px;
            left: 10px;
            /* Fallback for devices that support safe-area-inset */
            bottom: max(10px, env(safe-area-inset-bottom, 10px));
            left: max(10px, env(safe-area-inset-left, 10px));
          }
          #chatiq-widget-window {
            margin-bottom: 70px;
            max-height: calc(100dvh - 100px);
          }
        }
        @media (max-height: 700px) {
          #chatiq-widget-window {
            margin-bottom: 70px;
            max-height: calc(100dvh - 100px);
          }
        }
      `,
      inline: `
        #chatiq-widget-container {
          position: relative;
        }
        #chatiq-widget-window {
          margin-top: 20px;
        }
      `,
    };
    return positions[position] || positions["bottom-right"];
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function renderMarkdownSegment(text) {
    if (!text) return "";
    let safe = escapeHtml(text);

    // Inline code
    safe = safe.replace(
      /`([^`]+)`/g,
      '<code class="chatiq-inline-code">$1</code>'
    );

    // Bold
    safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Italic
    safe = safe.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
    safe = safe.replace(/(^|[^_])_([^_]+)_(?!_)/g, "$1<em>$2</em>");

    // Links
    const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    safe = safe.replace(linkPattern, (match, linkText, url) => {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        const safeText = escapeHtml(linkText);
        const safeUrl = escapeHtml(url);
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
      }
      return escapeHtml(match);
    });

    return renderMarkdownLines(safe);
  }

  function renderMarkdownLines(html) {
    const lines = html.split(/\n/);
    let result = "";
    let inUl = false;
    let inOl = false;

    const closeLists = () => {
      if (inUl) {
        result += "</ul>";
        inUl = false;
      }
      if (inOl) {
        result += "</ol>";
        inOl = false;
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        closeLists();
        return;
      }

      const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
      if (ulMatch) {
        if (inOl) {
          closeLists();
        }
        if (!inUl) {
          result += "<ul>";
          inUl = true;
        }
        result += `<li>${ulMatch[1]}</li>`;
        return;
      }

      const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
      if (olMatch) {
        if (inUl) {
          closeLists();
        }
        if (!inOl) {
          result += "<ol>";
          inOl = true;
        }
        result += `<li>${olMatch[1]}</li>`;
        return;
      }

      closeLists();
      result += `<p>${line}</p>`;
    });

    closeLists();
    return result;
  }

  function renderMessageContent(text) {
    if (!text) return "";
    const raw = String(text);
    const codePattern = /```([\s\S]*?)```/g;
    let output = "";
    let lastIndex = 0;
    let match;

    while ((match = codePattern.exec(raw)) !== null) {
      output += renderMarkdownSegment(raw.slice(lastIndex, match.index));
      output += `<pre><code>${escapeHtml(match[1])}</code></pre>`;
      lastIndex = match.index + match[0].length;
    }

    output += renderMarkdownSegment(raw.slice(lastIndex));
    return output;
  }

  // Create widget HTML
  widgetContainer.innerHTML = `
    <div id="chatiq-widget-window">
      <div id="chatiq-widget-header">
        <h3>${escapeHtml(config.headerTitle)}</h3>
        <button id="chatiq-widget-close" aria-label="Close chat">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div id="chatiq-widget-messages">
        <div id="chatiq-widget-typing">
          <div class="chatiq-typing-dot"></div>
          <div class="chatiq-typing-dot"></div>
          <div class="chatiq-typing-dot"></div>
        </div>
      </div>
      <div id="chatiq-widget-input-container">
        <input 
          type="text" 
          id="chatiq-widget-input" 
          placeholder="Type your message..."
          autocomplete="off"
          inputmode="text"
        />
        <button id="chatiq-widget-send" aria-label="Send message">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
          </svg>
        </button>
      </div>
    </div>
    <button id="chatiq-widget-button" aria-label="Open chat">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
      </svg>
    </button>
  `;

  // Get DOM elements
  const button = document.getElementById("chatiq-widget-button");
  const window = document.getElementById("chatiq-widget-window");
  const closeBtn = document.getElementById("chatiq-widget-close");
  const messagesContainer = document.getElementById("chatiq-widget-messages");
  const typingIndicator = document.getElementById("chatiq-widget-typing");
  const input = document.getElementById("chatiq-widget-input");
  const sendBtn = document.getElementById("chatiq-widget-send");

  // Ensure button is visible initially
  if (button) {
    button.style.display = "flex";
    button.style.visibility = "visible";
    button.style.opacity = "1";
  }

  // Check if device is mobile
  function isMobileDevice() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      (window.innerWidth <= 768 && "ontouchstart" in window)
    );
  }

  // Ensure button is visible on mobile - add explicit positioning if needed
  if (isMobileDevice() && button) {
    // Force button visibility with a small delay to ensure DOM is ready
    setTimeout(() => {
      if (button) {
        button.style.display = "flex";
        button.style.visibility = "visible";
        button.style.opacity = "1";
        button.style.pointerEvents = "auto";
      }
      if (widgetContainer) {
        widgetContainer.style.display = "block";
        widgetContainer.style.visibility = "visible";
      }
    }, 100);
  }
  function isMobileDevice() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      (window.innerWidth <= 768 && "ontouchstart" in window)
    );
  }

  // Calculate and set mobile widget size
  function setMobileWidgetSize() {
    if (!isMobileDevice()) return;

    // Get actual viewport height (accounting for browser chrome)
    const viewportHeight = window.innerHeight;
    const safeAreaTop = 80; // Generous padding for address bar

    // Get the widget window's current position (when open, it's above the button)
    const windowRect = window.getBoundingClientRect();
    const containerRect = widgetContainer.getBoundingClientRect();

    // Calculate available height: from safe area top to bottom of container
    // The container is positioned from the bottom, so we know where the bottom is
    const containerBottom = containerRect.bottom;
    const maxHeight = containerBottom - safeAreaTop - 20; // 20px padding from safe area

    // Set the widget height, ensuring it doesn't go above safe area
    window.style.height = `${Math.max(maxHeight, 300)}px`; // Minimum 300px
    window.style.maxHeight = `${Math.max(maxHeight, 300)}px`;
  }

  // Toggle widget
  function toggleWidget() {
    isOpen = !isOpen;
    if (isOpen) {
      window.classList.add("open");
      // Remove margin when button is hidden so widget appears in button's position
      window.style.marginBottom = "0";
      // Hide button when widget opens (use setProperty with important to override any conflicting styles)
      if (button) {
        button.style.setProperty("display", "none", "important");
      }

      // On mobile, ensure widget doesn't go above safe area and set proper size
      if (isMobileDevice()) {
        // Use requestAnimationFrame to ensure layout is calculated
        requestAnimationFrame(() => {
          setMobileWidgetSize();
          scrollToBottom();
        });

        // Also set on resize in case viewport changes
        const resizeHandler = () => {
          if (isOpen) {
            setMobileWidgetSize();
          }
        };
        window.addEventListener("resize", resizeHandler);
        // Store handler for cleanup
        window._widgetResizeHandler = resizeHandler;

        document.body.style.overflow = "hidden";
        // Don't auto-focus on mobile to prevent zoom
        // User can tap to focus when ready
      } else {
        input.focus();
        scrollToBottom();
      }
    } else {
      window.classList.remove("open");
      // Restore margin when button is visible
      window.style.marginBottom = "";
      // Show button when widget closes (use setProperty with important to override any conflicting styles)
      if (button) {
        button.style.setProperty("display", "flex", "important");
      }
      // Reset widget size (container positioning stays the same for button)
      if (isMobileDevice()) {
        window.style.height = "";
        window.style.maxHeight = "";
        // Remove resize handler
        if (window._widgetResizeHandler) {
          window.removeEventListener("resize", window._widgetResizeHandler);
          window._widgetResizeHandler = null;
        }
      }
      // Restore body scroll
      if (isMobileDevice()) {
        document.body.style.overflow = "";
      }
    }
  }

  button.addEventListener("click", toggleWidget);

  // Ensure close button is clickable
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleWidget();
    });
  }

  // Close widget on ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      toggleWidget();
    }
  });

  // Track streaming message element to avoid full re-render
  let streamingMessageElement = null;

  // Render messages
  function renderMessages(updateStreamingOnly = false) {
    // If we're streaming and only updating the streaming message, update it in place
    if (updateStreamingOnly && streamingMessageElement && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant" && lastMessage.content) {
        streamingMessageElement.querySelector(
          ".chatiq-message-bubble"
        ).innerHTML = renderMessageContent(lastMessage.content);
        scrollToBottom();
        return;
      }
    }

    // Get the typing indicator before clearing
    const typingActive = typingIndicator.classList.contains("active");

    // Render messages
    const messagesHTML = messages
      .map((msg, index) => {
        const content = (msg.content || "").trim();

        // Skip rendering completely empty assistant messages to avoid a "ghost"
        // bubble before any response content has arrived.
        if (!content && msg.role === "assistant") {
          return "";
        }

        const isStreamingAssistantMessage =
          index === messages.length - 1 && msg.role === "assistant" && isStreaming;

        return `
      <div class="chatiq-message ${msg.role}" ${
        isStreamingAssistantMessage ? 'data-streaming="true"' : ""
      }>
        <div class="chatiq-message-bubble">${renderMessageContent(
          msg.content
        )}</div>
      </div>
    `;
      })
      .join("");

    // Set innerHTML and restore typing indicator
    messagesContainer.innerHTML = messagesHTML;

    // Find and store streaming message element if streaming
    if (isStreaming && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant") {
        streamingMessageElement = messagesContainer.querySelector(
          '[data-streaming="true"]'
        );
      }
    } else {
      streamingMessageElement = null;
    }

    // Re-append typing indicator inside messages container
    messagesContainer.appendChild(typingIndicator);

    // Restore typing state if it was active
    if (typingActive) {
      typingIndicator.classList.add("active");
      typingIndicator.style.display = "flex";
    }

    scrollToBottom();
  }

  // Show/hide typing indicator
  function setTyping(show) {
    if (show) {
      typingIndicator.classList.add("active");
      // Ensure typing indicator is visible and positioned correctly
      typingIndicator.style.display = "flex";
      typingIndicator.style.alignSelf = "flex-start";
    } else {
      // Hide typing indicator smoothly without causing layout shift
      typingIndicator.classList.remove("active");
      typingIndicator.style.display = "none";
    }
    scrollToBottom();
  }

  // Send message
  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isStreaming) return;

    // Add user message
    messages.push({ role: "user", content: text });
    updateLastSeen(new Date().toISOString());
    renderMessages();
    input.value = "";
    sendBtn.disabled = true;

    // Don't add empty assistant message yet - wait for first chunk
    // assistantIndex will be messages.length when we add the first message
    isStreaming = true;
    setTyping(true);

    // Abort any previous request
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message: text,
          bot_slug: config.botSlug,
          stream: true,
          conversation_id: conversationId,
          history: messages.slice(0, -2).slice(-10), // Last 10 messages excluding current
          source: "embed",
          source_detail: {
            origin:
              typeof window !== "undefined" && window.location?.origin
                ? window.location.origin
                : null,
            label: config.sourceLabel,
            embed_id: config.embedId,
          },
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: { message: "Unknown error" } }));
        throw new Error(error.error?.message || `HTTP ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantMessage = "";

      // Wait for first chunk before hiding typing indicator to avoid double bump
      let firstChunkReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              isStreaming = false;
              sendBtn.disabled = false;
              setTyping(false);
              if (assistantMessage) {
                messages[assistantIndex].content = assistantMessage;
                renderMessages(false); // Full render on completion
              }
              return;
            }

            try {
              const parsed = JSON.parse(data);

              // Handle conversation ID
              if (parsed.conversationId) {
                conversationId = parsed.conversationId;
                writeConversationId(conversationId);
                startConversationStream();
              }

              // Handle error
              if (parsed.error) {
                throw new Error(parsed.error.message || "Unknown error");
              }

              // Handle streaming content
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                // On first chunk, hide typing indicator and create assistant message
                if (!firstChunkReceived) {
                  firstChunkReceived = true;
                  setTyping(false);
                  // Create assistant message with first chunk
                  const assistantIndex = messages.length;
                  messages.push({ role: "assistant", content: content });
                  assistantMessage = content;
                  renderMessages(false); // Initial render
                } else {
                  // Update existing message (find the last assistant message)
                  assistantMessage += content;
                  const lastAssistantIndex = messages.length - 1;
                  if (messages[lastAssistantIndex].role === "assistant") {
                    messages[lastAssistantIndex].content = assistantMessage;
                    // Update only the streaming message to avoid full re-render
                    renderMessages(true);
                  }
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      isStreaming = false;
      sendBtn.disabled = false;
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
      isStreaming = false;
      sendBtn.disabled = false;
      setTyping(false);

      // Show error message (with upgrade link for evaluation expiry)
      const rawMessage =
        error && typeof error.message === "string"
          ? error.message
          : "Unknown error";
      if (
        rawMessage.includes("Evaluation period ended") ||
        rawMessage.includes("EVALUATION_EXPIRED")
      ) {
        messages[assistantIndex].content =
          "Your evaluation ended. Upgrade to re-enable embeds: https://www.chatiq.io/pricing";
      } else {
        messages[assistantIndex].content = `Error: ${rawMessage}`;
      }
      renderMessages();
      console.error("ChatIQ Widget Error:", error);
    }
  }

  // Send on button click
  sendBtn.addEventListener("click", sendMessage);

  // Send on Enter key
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Initial render
  renderMessages();
  loadConversationHistory();
})();
