// src/components/chat/floating-chat-widget.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "./use-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { TypingIndicator } from "./typing-indicator";
import { MessageMarkdown } from "./message-markdown";

interface FloatingChatWidgetProps {
  botSlug: string;
  source?: string;
  sourceDetail?: Record<string, unknown>;
}

export default function FloatingChatWidget({
  botSlug,
  source,
  sourceDetail,
}: FloatingChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInteractedRef = useRef(false);

  const { messages, input, setInput, sendMessage, loading } = useChat(botSlug, {
    isInternal: true, // Homepage widget is part of main app
    source,
    sourceDetail,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator =
    loading &&
    lastMessage?.role === "assistant" &&
    !lastMessage.content.trim().length;

  const unseen = Math.max(
    0,
    messages.filter((m) => m.role === "assistant").length - 1
  );

  useEffect(() => {
    if (!loading && hasInteractedRef.current) {
      inputRef.current?.focus();
    }
  }, [loading]);

  return (
    <div className="fixed bottom-6 right-6 z-[70]">
      {isOpen && (
        <Card className="mb-4 w-80 h-96 bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-300 flex flex-col gap-0 py-0">
          {/* Header */}
          <div className="bg-emerald-600 dark:bg-emerald-700 text-white p-4 flex items-center">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Chat with us</h3>
                <p className="text-xs text-emerald-100">
                  We&apos;re here to help!
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-4">
            {messages.map((m, idx) => {
              const content = m.content.trim();

              // Don't render an empty assistant bubble while we're still waiting
              // for the first chunk of the response – the typing indicator below
              // handles the "bot is responding" state.
              if (!content.length && m.role === "assistant") {
                return null;
              }

              return (
                <div
                  key={idx}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                      m.role === "user"
                        ? "bg-emerald-600 text-white rounded-br-md"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md"
                    }`}
                  >
                    <MessageMarkdown content={content} />
                  </div>
                </div>
              );
            })}

            {showTypingIndicator && (
              <div className="flex justify-start">
                <TypingIndicator />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                hasInteractedRef.current = true;
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-full border-zinc-300 dark:border-zinc-700 focus:border-emerald-500 focus:ring-emerald-500"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={!input.trim() || loading}
                size="icon"
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}

      {/* Chat Control Buttons */}
      <div className="flex justify-end gap-2 mt-2">
        <Button
          onClick={() => setIsOpen(false)}
          className={`w-12 h-12 rounded-full bg-zinc-600 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 ${
            isOpen ? "flex" : "hidden"
          } items-center justify-center`}
        >
          <div className="flex items-center justify-center w-5 h-5">
            <X className="w-6 h-6 text-white" />
          </div>
        </Button>

        <Button
          onClick={() => setIsOpen(true)}
          className={`w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 ${
            isOpen ? "hidden" : "block"
          }`}
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      </div>

      {/* Notification Badge */}
      {!isOpen && unseen > 0 && (
        <div className="absolute -top-1 -left-3 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
          {unseen}
        </div>
      )}
    </div>
  );
}
