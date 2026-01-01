// src/components/bot/bot-shell.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Lock, LockOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BotTheme {
  pageBackground: string;
  pageText: string;
  botBackground: string;
  botBorder: string;
  primary: string;
  secondary: string;
  messageUser: string;
  messageAssistant: string;
}

interface BotShellProps {
  title: string;
  subtitle?: string;
  backLinkLabel: string;
  theme: BotTheme;
  /** Preview mode renders static content and disables interactions. */
  mode?: "preview" | "live";
}

export function BotShell({
  title,
  subtitle,
  backLinkLabel,
  theme,
  mode = "preview",
}: BotShellProps) {
  const isPreview = mode === "preview";

  const [previewPrivate, setPreviewPrivate] = useState(false);

  return (
    <div
      className="w-full max-w-full overflow-hidden rounded-xl border shadow-sm px-4 py-4 sm:px-6 sm:py-5"
      style={{
        backgroundColor: theme.pageBackground,
        borderColor: theme.botBorder,
        color: theme.pageText,
      }}
    >
      {/* Back link */}
      <div className="mb-10 flex items-center text-xs">
        <button
          type="button"
          className="flex items-center gap-2 text-[11px]"
          disabled={isPreview}
          style={{ color: theme.primary }}
        >
          <span className="text-lg leading-none">←</span>
          <span>{backLinkLabel}</span>
        </button>
      </div>

      {/* Title / subtitle */}
      <div className="mb-10 text-center">
        <h1
          className="text-2xl font-semibold mb-2"
          style={{ color: theme.primary }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-sm"
            style={{ color: theme.pageText, opacity: 0.85 }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Bot container */}
      <div
        className="mx-auto w-full max-w-full rounded-2xl border"
        style={{
          backgroundColor: theme.botBackground,
          borderColor: theme.botBorder,
        }}
      >
        {/* Chat surface with static mock bubbles */}
        <div
          className="border-b px-6 py-4 space-y-3 max-h-52 overflow-y-auto"
          style={{ borderColor: theme.botBorder }}
        >
          {/* Assistant bubble */}
          <div className="flex text-sm justify-start">
            <div
              className="max-w-[80%] rounded-2xl px-4 py-2 shadow-sm"
              style={{
                backgroundColor: theme.messageAssistant,
                color: theme.pageText,
              }}
            >
              <p className="text-xs font-semibold mb-1">Bot</p>
              <p className="text-xs md:text-sm">
                Hi! I’m your assistant. Ask me anything about this bot or your
                content.
              </p>
            </div>
          </div>

          {/* User bubble */}
          <div className="flex text-sm justify-end">
            <div
              className="max-w-[80%] rounded-2xl px-4 py-2 shadow-sm"
              style={{
                backgroundColor: theme.messageUser,
                color: theme.pageText,
              }}
            >
              <p className="text-xs font-semibold mb-1">You</p>
              <p className="text-xs md:text-sm">
                Great, show me how this bot will look when it’s embedded on my
                site.
              </p>
            </div>
          </div>
        </div>

        {/* Input row */}
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: theme.botBorder }}
        >
          <form
            className="flex items-center gap-3 sm:flex-row flex-col "
            onSubmit={(e) => {
              e.preventDefault();
              // No-op in preview; this form is purely visual.
            }}
          >
            <input
              className="flex-1 rounded-full border px-4 py-2 text-sm bg-transparent outline-none"
              style={{
                borderColor: theme.botBorder,
                backgroundColor: theme.botBackground,
                color: theme.pageText,
              }}
              placeholder="Ask anything..."
              readOnly={true}
            />
            <Button
              type="submit"
              size="sm"
              disabled={false}
              className={cn("px-6")}
              style={{
                backgroundColor: theme.primary,
                color: "#FFFFFF",
              }}
            >
              Send
            </Button>
          </form>
        </div>

        {/* Toggle row */}
        <div
          className="px-6 py-3 flex items-center gap-2"
          style={{ borderColor: theme.botBorder }}
        >
          <div
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs"
            style={{
              borderColor: theme.botBorder,
              backgroundColor: theme.botBackground,
              color: theme.pageText,
            }}
          >
            {previewPrivate ? (
              <Lock className="h-4 w-4" style={{ color: theme.primary }} />
            ) : (
              <LockOpen className="h-4 w-4" style={{ color: theme.pageText }} />
            )}
            <Switch
              checked={isPreview ? previewPrivate : undefined}
              onCheckedChange={(v) => isPreview && setPreviewPrivate(v)}
              className="scale-90"
              style={{
                backgroundColor: previewPrivate ? theme.primary : undefined,
                borderColor: previewPrivate ? theme.primary : undefined,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
