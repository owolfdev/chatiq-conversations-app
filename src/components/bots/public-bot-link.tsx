"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface PublicBotLinkProps {
  botSlug: string;
  isPublic: boolean;
  status: string;
  variant?: "default" | "compact";
  tooltip?: string;
  className?: string;
}

export function PublicBotLink({
  botSlug,
  isPublic,
  status,
  variant = "default",
  tooltip,
  className,
}: PublicBotLinkProps) {
  const [copied, setCopied] = useState(false);
  const publicUrl = `https://bot.chatiq.io/${botSlug}`;
  const isActiveAndPublic = isPublic && status === "active";

  if (!isActiveAndPublic) {
    return null;
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Public bot URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "compact") {
    const button = (
      <Button
        variant="outline"
        size="sm"
        onClick={copyToClipboard}
        className={["gap-2", className].filter(Boolean).join(" ")}
      >
        {copied ? (
          <>
            <Check className="h-3 w-3" /> Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" /> Copy Public Link
          </>
        )}
      </Button>
    );

    if (tooltip) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  }

  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      <div className="flex items-center justify-between">
        <Label htmlFor="public-url">Public Bot URL</Label>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-auto p-1 text-xs"
        >
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Open
          </a>
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Input
          id="public-url"
          type="text"
          value={publicUrl}
          readOnly
          className="font-mono text-sm"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={copyToClipboard}
          className="shrink-0"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600 transition-all duration-150" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Share this link to allow anyone to chat with your bot without signing in.
      </p>
    </div>
  );
}
