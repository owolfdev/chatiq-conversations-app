// src/app/dashboard/bots/new/new-bot-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { createBot } from "@/app/actions/bots/create-bot";
import { Checkbox } from "@/components/ui/checkbox";

export default function NewBotForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [description, setDescription] = useState("");
  const [tone, setTone] = useState("");
  const [website, setWebsite] = useState("");
  const [useRootBacklink, setUseRootBacklink] = useState(true);
  const [supportEmail, setSupportEmail] = useState("");
  const [supportUrl, setSupportUrl] = useState("");
  const [supportPhone, setSupportPhone] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const text = e.target.value;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount <= 300) {
      setDescription(text);
      if (error === "Description must be 300 words or fewer.") setError("");
    } else {
      setError("Description must be 300 words or fewer.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Show optimistic toast immediately
    const createToast = toast.loading("Creating bot...", {
      description: "Please wait while we create your bot.",
    });

    const result = await createBot({
      description,
      tone: tone || undefined,
      website: website || undefined,
      useRootBacklink,
      supportEmail: supportEmail || undefined,
      supportUrl: supportUrl || undefined,
      supportPhone: supportPhone || undefined,
    });

    setLoading(false);

    if (result.success && result.slug) {
      toast.success("Bot created successfully", {
        id: createToast,
        description:
          "Your new bot is ready to tune. Test it and adjust responses on the next page.",
      });
      startTransition(() =>
        router.push(`/dashboard/bots/${result.slug}?success=1`)
      );
    } else if (result.success) {
      toast.success("Bot created successfully", {
        id: createToast,
        description:
          "Your new bot is ready to use! Redirecting you back to your bots.",
      });
      startTransition(() => router.push("/dashboard/bots"));
    } else {
      setError(result.error || "An unknown error occurred");
      toast.error("Failed to create bot", {
        id: createToast,
        description: result.error || "An unknown error occurred",
      });
    }
  };

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="description" className="text-base font-medium">
              Description
            </Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Share the audience, purpose, products or services, and key FAQs.
                Aim for 80–200 words so we have enough context to build the bot.
              </TooltipContent>
            </Tooltip>
          </div>
          <Textarea
            id="description"
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Example: We need a support bot for our B2B analytics platform. It should onboard new users, explain pricing tiers, and route sales questions..."
            required
            className="min-h-26"
          />
          <p className="text-xs text-muted-foreground">
            {description.trim().split(/\s+/).filter(Boolean).length} / 300 words
            (recommended 80–200)
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="tone" className="text-base font-medium">
            Tone (optional)
          </Label>
          <div className="flex flex-wrap gap-2">
            {[
              "Friendly & concise",
              "Professional guide",
              "Playful & upbeat",
              "Technical expert",
            ].map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setTone(preset)}
              >
                {preset}
              </Button>
            ))}
          </div>
          <Input
            id="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="e.g. Calm, confident product specialist"
          />
          <p className="text-xs text-muted-foreground">
            Choose a preset or describe your own. Leave blank to keep it
            neutral.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="website" className="text-base font-medium">
            Website (optional)
          </Label>
          <Input
            id="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com/about"
          />
          <p className="text-xs text-muted-foreground">
            Share an info-rich page (like /about or /product). We’ll ingest it
            and turn it into knowledge for your chatbot.
          </p>
          <div className="flex items-center gap-2">
            <Checkbox
              id="use_root_backlink"
              checked={useRootBacklink}
              onCheckedChange={(checked) =>
                setUseRootBacklink(checked === true)
              }
            />
            <Label htmlFor="use_root_backlink" className="text-sm">
              Use root domain for backlinks (default)
            </Label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="support" className="text-base font-medium">
            Support Contact (optional)
          </Label>
          <p className="text-xs text-muted-foreground">
            Add support contact information to help users reach you. This will
            be added to the bot's system prompt and contact responses.
          </p>
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="support_email" className="text-sm">
                Support Email
              </Label>
              <Input
                id="support_email"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@example.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="support_url" className="text-sm">
                Contact Page URL
              </Label>
              <Input
                id="support_url"
                type="url"
                value={supportUrl}
                onChange={(e) => setSupportUrl(e.target.value)}
                placeholder="https://example.com/contact"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="support_phone" className="text-sm">
                Phone Number
              </Label>
              <Input
                id="support_phone"
                type="tel"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button
          type="submit"
          disabled={loading || isPending || !description.trim()}
          size="lg"
        >
          {loading || isPending ? "Creating..." : "Create Bot"}
        </Button>
      </form>
    </TooltipProvider>
  );
}
