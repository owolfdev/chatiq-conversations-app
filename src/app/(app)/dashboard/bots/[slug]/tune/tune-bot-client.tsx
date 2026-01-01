// src/app/dashboard/bots/[slug]/tune/tune-bot-client.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Chat from "@/components/chat/chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Bot } from "@/types/bot";
import { toast } from "sonner";
import { updateBot } from "@/app/actions/bots/update-bot";
import { CannedResponsesInlineEditor } from "@/components/bots/canned-responses-inline-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Info,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Sparkles,
  Settings,
} from "lucide-react";

type TuneBotClientProps = {
  bot: Bot;
  showWelcome: boolean;
  isTeamMember: boolean;
};

export default function TuneBotClient({
  bot,
  showWelcome,
  isTeamMember,
}: TuneBotClientProps) {
  const [systemPrompt, setSystemPrompt] = useState(bot.system_prompt || "");
  const [defaultResponse, setDefaultResponse] = useState(
    bot.default_response || ""
  );
  const [isSaving, startTransition] = useTransition();

  const handleSaveBotSettings = () => {
    startTransition(async () => {
      const result = await updateBot(bot.id, {
        system_prompt: systemPrompt,
        default_response: defaultResponse || null,
      });

      if (result.success) {
        toast.success("Bot instructions saved");
      } else {
        toast.error(result.error || "Failed to save bot settings");
      }
    });
  };

  return (
    <main>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-primary">Tune</p>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold leading-tight">
                {bot.name} — test and refine
              </h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Sparkles
                      className={cn(
                        "h-5 w-5",
                        bot.llm_enabled !== false
                          ? "text-primary"
                          : "text-muted-foreground opacity-40"
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {bot.llm_enabled !== false
                      ? "AI responses enabled"
                      : "AI responses disabled"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-muted-foreground">
              Chat with the bot, adjust its instructions and pre-configured
              responses, then test again without leaving the page.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild>
                    <Link href={`/dashboard/bots/${bot.slug}/settings`}>
                      <span className="sr-only">Settings</span>
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Go to settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/bots/${bot.slug}`}>Done</Link>
            </Button>
          </div>
        </div>

        {showWelcome && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Bot created!</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>
                Test your bot below, adjust the system prompt or defaults, and
                add pre-configured responses for obvious prompts.
              </p>
              <p>
                You can keep this page open: chat at the top, tweak settings,
                then test again instantly.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="h-4 w-4" />
              Test your bot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5" />
              <p>
                This is the live bot experience. Private mode is enabled so test
                chats are not saved. Send a few messages to confirm your system
                prompt and pre-configured responses behave as expected.
                Duplicate prompts skip the same pre-configured response on a
                second try, so refresh chat to re-test.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => location.reload()}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh chat
              </Button>
            </div>
            <div className="rounded-lg">
              <Chat
                botSlug={bot.slug}
                initialMessages={undefined}
                initialConversationId={null}
                isInternal={isTeamMember}
                initialPrivateMode
                hidePrivacyToggle
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle className="text-lg font-semibold mb-1.5">
                How to guide your bot
              </AlertTitle>
              <AlertDescription className="space-y-1">
                <p>
                  <strong>System prompt</strong>: Describe the bot's role, tone,
                  guardrails, and what sources it should rely on. Keep it
                  concise but explicit.
                </p>
                <p>
                  <strong>Default response</strong>: Used when the LLM is
                  unavailable and no pre-configured response matches. Keep it
                  short and helpful, or leave blank to surface an error.
                </p>
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="system_prompt">System prompt</Label>
              <Textarea
                id="system_prompt"
                rows={6}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Guide the assistant's behavior and domain expertise."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_response">Default response</Label>
              <Textarea
                id="default_response"
                rows={4}
                value={defaultResponse}
                onChange={(e) => setDefaultResponse(e.target.value)}
                placeholder="Used when the LLM is unavailable and no pre-configured response matches."
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to surface an error if the LLM is unavailable and no
                pre-configured response applies.
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveBotSettings} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save instructions
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Pre-configured responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-2 text-sm text-muted-foreground">
              <p>
                Use pre-configured responses for high-confidence, low-effort
                intents (greetings, help, who-are-you, contact, off-topic). They
                run before the LLM.
              </p>
              <p>
                Patterns can be keywords separated by pipes (e.g.,{" "}
                <code>hi|hello|hey</code>), regex for advanced matching, or
                exact strings. Keep them narrow to avoid accidental matches.
              </p>
            </div>
            <CannedResponsesInlineEditor botId={bot.id} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
