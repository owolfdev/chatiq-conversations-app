// components/forms/document-form.tsx
"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import MultiSelect from "@/components/custom-fields/multi-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Loader2, Link as LinkIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { importFromUrl } from "@/app/actions/documents/import-from-url";

const MAX_CHARACTERS = 20000;

interface DocumentFormProps {
  initialValues?: {
    title: string;
    content: string;
    tags: string[];
    is_global: boolean;
    linkedBots: string[];
    canonicalUrl?: string | null;
  };
  availableBots: { id: string; name: string }[];
  onSubmit: (data: {
    title: string;
    content: string;
    tags: string[];
    is_global: boolean;
    linkedBots: string[];
    canonicalUrl?: string;
  }) => Promise<void>;
  loading: boolean;
  status?: string | null;
  error: string | null;
}

export default function DocumentForm({
  initialValues,
  availableBots,
  onSubmit,
  loading,
  status,
  error,
}: DocumentFormProps) {
  const [title, setTitle] = useState(initialValues?.title || "");
  const [content, setContent] = useState(initialValues?.content || "");
  const [tags, setTags] = useState(initialValues?.tags.join(", ") || "");
  const [isGlobal, setIsGlobal] = useState(initialValues?.is_global || false);
  const [linkedBots, setLinkedBots] = useState<string[]>(
    initialValues?.linkedBots || []
  );
  const [canonicalUrl, setCanonicalUrl] = useState(
    initialValues?.canonicalUrl || ""
  );
  const [showGlobalAlert, setShowGlobalAlert] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || (!file.name.endsWith(".md") && !file.name.endsWith(".txt"))) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        const prefix = content.trim();
        const combined = `${prefix}${prefix ? "\n\n" : ""}${text}`.slice(
          0,
          MAX_CHARACTERS
        );
        setContent(combined);
      }
    };
    reader.readAsText(file);
  };

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      setImportError("Please enter a URL");
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const result = await importFromUrl(importUrl.trim());

      if (!result.success) {
        setImportError(result.error || "Failed to import from URL");
        setIsImporting(false);
        return;
      }

      // Populate form with imported content
      if (result.title) {
        setTitle(result.title);
      }
      if (result.content) {
        setContent(result.content);
      }
      // Set canonical URL to the imported URL
      setCanonicalUrl(importUrl.trim());

      // Clear import URL and error
      setImportUrl("");
      setImportError(null);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Failed to import from URL"
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tagArray = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    if (tagArray.length === 0) return alert("Please enter at least one tag.");
    if (!isGlobal && linkedBots.length === 0) {
      setShowGlobalAlert(true);
      return;
    }

    if (canonicalUrl) {
      try {
        new URL(canonicalUrl);
      } catch {
        return alert("Canonical URL must be a valid URL (including protocol).");
      }
    }

    await onSubmit({
      title,
      content,
      tags: tagArray,
      is_global: isGlobal,
      linkedBots,
      canonicalUrl: canonicalUrl.trim() || undefined,
    });
  };

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="space-y-6">
        {showGlobalAlert && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Unlinked Document</AlertTitle>
            <AlertDescription>
              This document is not linked to any bots. Do you want to make it
              global?
              <div className="mt-4 flex gap-4">
                <Button
                  size="sm"
                  onClick={() => {
                    setIsGlobal(true);
                    setShowGlobalAlert(false);
                  }}
                >
                  Yes, make global
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowGlobalAlert(false)}
                >
                  Cancel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Label>Canonical URL</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Optional. Provide a public URL where this content lives so we
                  can cite it in responses.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            value={canonicalUrl}
            onChange={(e) => setCanonicalUrl(e.target.value)}
            placeholder="https://example.com/docs/article"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Label>Tags (comma-separated)</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Tags help the bot match documents to user questions. Add at
                  least one.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. pricing, onboarding"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Label>Content (Markdown supported)</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  This content will be injected into the AI prompt. Max length
                  is constrained due to GPT token limits.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Textarea
            value={content}
            onChange={(e) =>
              setContent(e.target.value.slice(0, MAX_CHARACTERS))
            }
            rows={10}
            required
          />
          <p className="text-sm text-muted-foreground">
            {content.length}/{MAX_CHARACTERS} characters
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Label>Import from URL</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Import content from any webpage. The page will be fetched,
                  parsed, and the text content will be extracted and populated
                  into the form. Only HTTP/HTTPS URLs are supported.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex gap-2">
            <Input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://example.com/docs/article"
              disabled={isImporting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isImporting) {
                  e.preventDefault();
                  handleImportFromUrl();
                }
              }}
            />
            <Button
              type="button"
              onClick={handleImportFromUrl}
              disabled={isImporting || !importUrl.trim()}
              variant="outline"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </div>
          {importError && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Label className="mb-1">Upload file (.md or .txt)</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Uploaded content is appended to the textarea, respecting max
                  character limit. Supports Markdown (.md) and plain text (.txt) files.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input type="file" accept=".md,.txt" onChange={handleFileUpload} />
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={isGlobal} onCheckedChange={setIsGlobal} />
          <Label>Make Global (available to all bots)</Label>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Label>Link to Bots</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Linked bots will be allowed to use this document. Multiple
                  bots can be linked.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <MultiSelect
            value={linkedBots}
            onChange={setLinkedBots}
            options={availableBots.map((bot) => ({
              id: bot.id,
              name: bot.name,
            }))}
            placeholder="Select bots to link"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status && (
          <Alert>
            <AlertTitle>Processing</AlertTitle>
            <AlertDescription className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {status}
            </AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={loading}>
          {loading
            ? "Processing..."
            : initialValues
            ? "Save Changes"
            : "Create Document"}
        </Button>
      </form>
    </TooltipProvider>
  );
}
