// src/app/dashboard/bots/[slug]/settings/edit-bot-form.tsx
"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  ChevronDown,
  ChevronUp,
  Palette,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Bot } from "@/types/bot";
import { BotShell, type BotTheme } from "@/components/bot/bot-shell";
import { PublicBotLink } from "@/components/bots/public-bot-link";
import { Checkbox } from "@/components/ui/checkbox";

import { updateBot } from "@/app/actions/bots/update-bot";
import { deleteBot } from "@/app/actions/bots/delete-bot";
import { clearBotResponseCache } from "@/app/actions/bots/clear-bot-cache";
import { Trash2, RefreshCw, Code, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";

export default function EditBotForm({
  initialBot,
  isFreeTierExpired,
}: {
  initialBot: Bot;
  isFreeTierExpired: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const DELETE_CONFIRMATION_TEXT = "delete my bot";
  const [isCacheDialogOpen, setIsCacheDialogOpen] = useState(false);

  const DEFAULT_COLORS = {
    background: "#F9FAFB",
    container: "#FFFFFF",
    text: "#111827",
    border: "#E5E7EB",
    primary: "#3B82F6",
    secondary: "#93C5FD",
    messageUser: "#DBEAFE",
    messageAssistant: "#F3F4F6",
  };

  const COLOR_PRESETS: { name: string; colors: typeof DEFAULT_COLORS }[] = [
    {
      name: "Default",
      colors: DEFAULT_COLORS,
    },
    {
      name: "Emerald",
      colors: {
        background: "#F6FFFB",
        container: "#FFFFFF",
        text: "#0F172A",
        border: "#D9F3EA",
        primary: "#10B981",
        secondary: "#6EE7B7",
        messageUser: "#DCFCE7",
        messageAssistant: "#F1F5F9",
      },
    },
    {
      name: "Indigo",
      colors: {
        background: "#F8FAFF",
        container: "#FFFFFF",
        text: "#0B1224",
        border: "#E0E7FF",
        primary: "#6366F1",
        secondary: "#A5B4FC",
        messageUser: "#E0E7FF",
        messageAssistant: "#EEF2FF",
      },
    },
    {
      name: "Slate",
      colors: {
        background: "#F8FAFC",
        container: "#FFFFFF",
        text: "#0F172A",
        border: "#E2E8F0",
        primary: "#334155",
        secondary: "#94A3B8",
        messageUser: "#E2E8F0",
        messageAssistant: "#F8FAFC",
      },
    },
    {
      name: "Neutral",
      colors: {
        background: "#F8F9FC",
        container: "#FFFFFF",
        text: "#1F2937",
        border: "#E5E7EB",
        primary: "#4B5563",
        secondary: "#9CA3AF",
        messageUser: "#E5E7EB",
        messageAssistant: "#F3F4F6",
      },
    },
  ];

  const [name, setName] = useState(initialBot.name || "");
  const [description, setDescription] = useState(initialBot.description || "");
  const [slug, setSlug] = useState(initialBot.slug || "");
  const [systemPrompt, setSystemPrompt] = useState(
    initialBot.system_prompt || ""
  );
  const [defaultResponse, setDefaultResponse] = useState(
    initialBot.default_response || ""
  );
  const [isPublic, setIsPublic] = useState(initialBot.is_public || false);
  const [status, setStatus] = useState<"active" | "draft" | "archived">(
    initialBot.status || "active"
  );
  const [richResponsesEnabled, setRichResponsesEnabled] = useState(
    initialBot.rich_responses_enabled ?? false
  );
  const [llmEnabled, setLlmEnabled] = useState(initialBot.llm_enabled ?? true);
  const isAiToggleDisabled = isFreeTierExpired;
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  // Color customization state
  const [primaryColor, setPrimaryColor] = useState<string | null>(
    initialBot.primary_color || DEFAULT_COLORS.primary
  );
  const [secondaryColor, setSecondaryColor] = useState<string | null>(
    initialBot.secondary_color || DEFAULT_COLORS.secondary
  );
  const [colorBackground, setColorBackground] = useState<string | null>(
    initialBot.color_background || DEFAULT_COLORS.background
  );
  const [colorContainerBackground, setColorContainerBackground] = useState<
    string | null
  >(initialBot.color_container_background || DEFAULT_COLORS.container);
  const [colorText, setColorText] = useState<string | null>(
    initialBot.color_text || DEFAULT_COLORS.text
  );
  const [colorBorder, setColorBorder] = useState<string | null>(
    initialBot.color_border || DEFAULT_COLORS.border
  );
  const [colorMessageUser, setColorMessageUser] = useState<string | null>(
    initialBot.color_message_user || DEFAULT_COLORS.messageUser
  );
  const [colorMessageAssistant, setColorMessageAssistant] = useState<
    string | null
  >(initialBot.color_message_assistant || DEFAULT_COLORS.messageAssistant);
  const [backLinkUrl, setBackLinkUrl] = useState<string | null>(
    initialBot.back_link_url || null
  );
  const [backLinkText, setBackLinkText] = useState<string | null>(
    initialBot.back_link_text || null
  );

  // Preview defaults & resolved colors

  const previewColors = {
    background: colorBackground || DEFAULT_COLORS.background,
    container: colorContainerBackground || DEFAULT_COLORS.container,
    text: colorText || DEFAULT_COLORS.text,
    border: colorBorder || DEFAULT_COLORS.border,
    primary: primaryColor || DEFAULT_COLORS.primary,
    secondary: secondaryColor || DEFAULT_COLORS.secondary,
    messageUser: colorMessageUser || DEFAULT_COLORS.messageUser,
    messageAssistant: colorMessageAssistant || DEFAULT_COLORS.messageAssistant,
  };

  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleteLinkedDocs, setDeleteLinkedDocs] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const text = e.target.value;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount <= 100) {
      setDescription(text);
      if (error === "Description must be 100 words or fewer.") setError("");
    } else {
      setError("Description must be 100 words or fewer.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (description.trim().split(/\s+/).length > 100) {
      setError("Description must be 100 words or fewer.");
      setLoading(false);
      return;
    }

    // Show optimistic toast immediately
    const updateToast = toast.loading("Updating bot...", {
      description: "Please wait while we save your changes.",
    });

    // Validate hex colors before submitting
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    const colorFields = [
      { value: primaryColor, name: "Primary Color" },
      { value: secondaryColor, name: "Secondary Color" },
      { value: colorBackground, name: "Background Color" },
      { value: colorContainerBackground, name: "Container Background Color" },
      { value: colorText, name: "Text Color" },
      { value: colorBorder, name: "Border Color" },
      { value: colorMessageUser, name: "User Message Color" },
      { value: colorMessageAssistant, name: "Assistant Message Color" },
    ];

    for (const field of colorFields) {
      if (field.value && !hexColorRegex.test(field.value)) {
        setError(`${field.name} must be a valid hex color (e.g., #4A6FA5)`);
        setLoading(false);
        return;
      }
    }

    const result = await updateBot(initialBot.id, {
      name,
      description,
      slug,
      system_prompt: systemPrompt,
      default_response: defaultResponse || null,
      is_public: isPublic,
      status,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      color_background: colorBackground,
      color_container_background: colorContainerBackground,
      color_text: colorText,
      color_border: colorBorder,
      color_message_user: colorMessageUser,
      color_message_assistant: colorMessageAssistant,
      back_link_url: backLinkUrl,
      back_link_text: backLinkText,
      rich_responses_enabled: richResponsesEnabled,
      llm_enabled: llmEnabled,
    });

    setLoading(false);

    if (result.success) {
      toast.success("Bot updated successfully", {
        id: updateToast,
        description: `"${name}" has been updated.`,
      });
      startTransition(() => router.push(`/dashboard/bots/${slug}`));
    } else {
      toast.error("Failed to update bot", {
        id: updateToast,
        description: result.error || "An unknown error occurred",
      });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteBot(initialBot.id, {
      deleteLinkedDocuments: deleteLinkedDocs,
    });
    setDeleting(false);

    if (result.success) {
      const deletedDocs = result.deletedDocuments ?? 0;
      const keptDocs = result.keptSharedDocuments ?? 0;
      const details =
        deletedDocs || keptDocs
          ? `Removed ${deletedDocs} linked document${
              deletedDocs === 1 ? "" : "s"
            }. ${
              keptDocs
                ? `${keptDocs} shared document${
                    keptDocs === 1 ? " was" : "s were"
                  } kept.`
                : ""
            }`
          : undefined;
      toast.success("Bot deleted successfully", {
        description: details,
      });
      router.push(`/dashboard/bots`);
    } else {
      toast.error(result.error || "Failed to delete bot");
    }
  };

  const toggleCacheClear = async () => {
    setClearingCache(true);
    const result = await clearBotResponseCache(initialBot.id);
    setClearingCache(false);

    if (result.success) {
      toast.success("Response cache cleared");
      setIsCacheDialogOpen(false);
    } else {
      toast.error(result.error || "Failed to clear cache");
    }
  };

  const theme: BotTheme = {
    pageBackground: previewColors.background,
    pageText: previewColors.text,
    botBackground: previewColors.container,
    botBorder: previewColors.border,
    primary: previewColors.primary,
    secondary: previewColors.secondary,
    messageUser: previewColors.messageUser,
    messageAssistant: previewColors.messageAssistant,
  };

  const initialStateString = useMemo(
    () =>
      JSON.stringify({
        name: initialBot.name || "",
        description: initialBot.description || "",
        slug: initialBot.slug || "",
        systemPrompt: initialBot.system_prompt || "",
        defaultResponse: initialBot.default_response || "",
        isPublic: initialBot.is_public || false,
        status: initialBot.status || "active",
        richResponsesEnabled: initialBot.rich_responses_enabled ?? false,
        llmEnabled: initialBot.llm_enabled ?? true,
        primaryColor: initialBot.primary_color || null,
        secondaryColor: initialBot.secondary_color || null,
        colorBackground: initialBot.color_background || null,
        colorContainerBackground: initialBot.color_container_background || null,
        colorText: initialBot.color_text || null,
        colorBorder: initialBot.color_border || null,
        colorMessageUser: initialBot.color_message_user || null,
        colorMessageAssistant: initialBot.color_message_assistant || null,
        backLinkUrl: initialBot.back_link_url || null,
        backLinkText: initialBot.back_link_text || null,
      }),
    [initialBot]
  );

  const currentStateString = useMemo(
    () =>
      JSON.stringify({
        name,
        description,
        slug,
        systemPrompt,
        defaultResponse,
        isPublic,
        status,
        richResponsesEnabled,
        llmEnabled,
        primaryColor,
        secondaryColor,
        colorBackground,
        colorContainerBackground,
        colorText,
        colorBorder,
        colorMessageUser,
        colorMessageAssistant,
        backLinkUrl,
        backLinkText,
      }),
    [
      backLinkText,
      backLinkUrl,
      colorBackground,
      colorBorder,
      colorContainerBackground,
      colorMessageAssistant,
      colorMessageUser,
      colorText,
      defaultResponse,
      description,
      isPublic,
      llmEnabled,
      name,
      primaryColor,
      richResponsesEnabled,
      secondaryColor,
      slug,
      status,
      systemPrompt,
    ]
  );

  const isDirty = currentStateString !== initialStateString;

  const handleCancel = () => {
    if (isDirty) {
      setShowCancelDialog(true);
      return;
    }
    router.push(`/dashboard/bots/${initialBot.slug}`);
  };

  const confirmDiscard = () => {
    setShowCancelDialog(false);
    router.push(`/dashboard/bots/${initialBot.slug}`);
  };

  const confirmSaveAndLeave = () => {
    formRef.current?.requestSubmit();
    setShowCancelDialog(false);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <form ref={formRef} onSubmit={handleUpdate} className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-primary pb-6">
                Edit
              </p>
              <h1 className="text-3xl font-bold mb-2">Setting & Preferences</h1>
              <p className="text-zinc-600 dark:text-zinc-400">
                Manage your bot appearance, navigation, and other settings.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={handleCancel}
                disabled={loading || isPending}
                size="lg"
              >
                Cancel
              </Button>
              <Button size="lg" type="submit" disabled={loading || isPending}>
                {loading || isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Bot Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="slug">Slug (URL-friendly)</Label>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={handleDescriptionChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      {description.trim().split(/\s+/).filter(Boolean).length} /
                      100 words
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Visibility & Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="is_public">Visibility</Label>
                    <Select
                      value={isPublic ? "public" : "private"}
                      onValueChange={(value) => setIsPublic(value === "public")}
                    >
                      <SelectTrigger id="is_public">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={status}
                      onValueChange={(value: "active" | "draft" | "archived") =>
                        setStatus(value)
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="rich_responses_enabled"
                      checked={richResponsesEnabled}
                      onCheckedChange={setRichResponsesEnabled}
                    />
                    <Label htmlFor="rich_responses_enabled">
                      Rich Responses (beta)
                    </Label>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <div className="flex flex-col items-start gap-2 flex-1 pt-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="llm_enabled"
                              checked={llmEnabled}
                              disabled={isAiToggleDisabled}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  // Enabling - update immediately
                                  setLlmEnabled(true);
                                } else {
                                  // Disabling - show confirmation dialog
                                  setShowDisableDialog(true);
                                }
                              }}
                            />

                            <Label
                              htmlFor="llm_enabled"
                              className="flex items-center gap-2"
                            >
                              <Sparkles
                                className={cn(
                                  "h-4 w-4",
                                  llmEnabled
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                )}
                              />
                              AI Responses
                            </Label>
                            <Dialog
                              open={showDisableDialog}
                              onOpenChange={(open) => {
                                setShowDisableDialog(open);
                                // If dialog is closed without confirming, keep LLM enabled
                                if (!open && llmEnabled) {
                                  // Dialog was closed, state is already correct
                                }
                              }}
                            >
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    Disable AI Responses?
                                  </DialogTitle>
                                </DialogHeader>
                                <p className="text-sm text-muted-foreground">
                                  When AI is disabled, your bot will only use
                                  pre-configured responses, cached responses, or
                                  the default response. The bot will not
                                  generate new AI-powered responses.
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">
                                  This is useful for testing, cost savings, or
                                  when you want to rely only on pre-configured
                                  responses.
                                </p>
                                {!defaultResponse && (
                                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                                    ⚠️ You haven't set a default response.
                                    Consider adding one in the Tune page so
                                    users get a helpful message when AI is
                                    disabled.
                                  </p>
                                )}
                                <DialogFooter className="mt-4">
                                  <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                  </DialogClose>
                                  <Button
                                    variant="destructive"
                                    onClick={() => {
                                      setLlmEnabled(false);
                                      setShowDisableDialog(false);
                                    }}
                                  >
                                    Disable AI
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Disable AI responses?.</p>
                        </TooltipContent>
                      </Tooltip>
                      {isAiToggleDisabled && (
                        <p className="text-xs text-muted-foreground">
                          AI responses are disabled after the evaluation period.
                          Upgrade to re-enable them.{" "}
                          <Link
                            href="/pricing"
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            View plans
                          </Link>
                          .
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tune your bot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Adjust the system prompt, default response, and
                    pre-configured responses on the Tune page, then test changes
                    instantly.
                  </p>
                  <Button asChild>
                    <Link href={`/dashboard/bots/${initialBot.slug}/tune`}>
                      Tune my bot
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="overflow-hidden min-w-0">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Preview</CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Live preview
                  </div>
                </CardHeader>
                {/* issue */}
                <CardContent className="px-3 py-4 sm:p-6 overflow-x-auto">
                  <div
                    className={cn(
                      "bg-muted/30",
                      "p-1 sm:p-4",
                      "sm:rounded-lg sm:border",
                      "w-full max-w-full min-w-0 overflow-hidden"
                    )}
                  >
                    <BotShell
                      theme={theme}
                      title={name || "Your Bot"}
                      subtitle={description || "Your bot description"}
                      backLinkLabel={backLinkText || "Back"}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Appearance
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAppearanceOpen(!isAppearanceOpen)}
                      type="button"
                    >
                      {isAppearanceOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {isAppearanceOpen && (
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Presets:
                      </span>
                      {COLOR_PRESETS.map((preset) => (
                        <Button
                          key={preset.name}
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => {
                            setPrimaryColor(preset.colors.primary);
                            setSecondaryColor(preset.colors.secondary);
                            setColorBackground(preset.colors.background);
                            setColorContainerBackground(
                              preset.colors.container
                            );
                            setColorText(preset.colors.text);
                            setColorBorder(preset.colors.border);
                            setColorMessageUser(preset.colors.messageUser);
                            setColorMessageAssistant(
                              preset.colors.messageAssistant
                            );
                          }}
                          className="text-xs"
                        >
                          {preset.name === "Default" ? "Default" : preset.name}
                        </Button>
                      ))}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Primary Color</Label>
                        <ColorPicker
                          label="Primary"
                          value={primaryColor}
                          onChange={setPrimaryColor}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Secondary Color</Label>
                        <ColorPicker
                          label="Secondary"
                          value={secondaryColor}
                          onChange={setSecondaryColor}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Background Color</Label>
                        <ColorPicker
                          label="Background"
                          value={colorBackground}
                          onChange={setColorBackground}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Container Background</Label>
                        <ColorPicker
                          label="Container"
                          value={colorContainerBackground}
                          onChange={setColorContainerBackground}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Text Color</Label>
                        <ColorPicker
                          label="Text"
                          value={colorText}
                          onChange={setColorText}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Border Color</Label>
                        <ColorPicker
                          label="Border"
                          value={colorBorder}
                          onChange={setColorBorder}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>User Message Color</Label>
                        <ColorPicker
                          label="User message"
                          value={colorMessageUser}
                          onChange={setColorMessageUser}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Assistant Message Color</Label>
                        <ColorPicker
                          label="Assistant message"
                          value={colorMessageAssistant}
                          onChange={setColorMessageAssistant}
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Navigation & Links
                    <Palette className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="back_link_url">Back Link URL</Label>
                    <Input
                      id="back_link_url"
                      value={backLinkUrl || ""}
                      onChange={(e) => setBackLinkUrl(e.target.value || null)}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="back_link_text">Back Link Text</Label>
                    <Input
                      id="back_link_text"
                      value={backLinkText || ""}
                      onChange={(e) => setBackLinkText(e.target.value || null)}
                      placeholder="Back to site"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Embed & API
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/bots/${initialBot.slug}/embed`}>
                        <Code className="h-4 w-4 mr-2" />
                        Embed widget
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/bots/${initialBot.slug}/tune`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Tune
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Embed your bot or connect via API. Use domain restrictions
                    in widget keys for security.
                  </p>
                  <PublicBotLink
                    botSlug={initialBot.slug}
                    isPublic={initialBot.is_public}
                    status={initialBot.status ?? "active"}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Channels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Connect this bot to external messaging channels like LINE,
                    Facebook Messenger, and WhatsApp.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/team/integrations">
                      Manage Integrations
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Cache & Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Clear cached bot responses to ensure new generations. This
                    does not affect documents.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Dialog
                      open={isCacheDialogOpen}
                      onOpenChange={setIsCacheDialogOpen}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DialogTrigger asChild>
                            <Button variant="outline">
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Clear Response Cache
                            </Button>
                          </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Clears all cached responses for this bot so future
                          messages are generated fresh.
                        </TooltipContent>
                      </Tooltip>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Clear Response Cache</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                          This will remove all cached responses for this bot,
                          forcing new responses to be generated. It cannot be
                          undone.
                        </p>
                        <DialogFooter className="mt-4">
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button
                            variant="destructive"
                            onClick={toggleCacheClear}
                            disabled={clearingCache}
                          >
                            {clearingCache ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Clear Cache
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/40">
                <CardHeader>
                  <CardTitle className="text-destructive">
                    Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Deleting this bot is permanent. Type{" "}
                    <span className="font-semibold text-destructive">{`"${DELETE_CONFIRMATION_TEXT}"`}</span>{" "}
                    to enable deletion, then confirm.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      className="sm:max-w-xs"
                      value={deleteConfirmationText}
                      onChange={(e) =>
                        setDeleteConfirmationText(e.target.value)
                      }
                      placeholder={DELETE_CONFIRMATION_TEXT}
                      aria-label="Type delete confirmation"
                    />
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          type="button"
                          disabled={
                            deleteConfirmationText.trim().toLowerCase() !==
                              DELETE_CONFIRMATION_TEXT || deleting
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Bot
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Bot</DialogTitle>
                          <p className="text-lg font-semibold text-destructive">
                            {initialBot.name}
                          </p>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                          This action cannot be undone. This will permanently
                          delete the bot and all its data.
                        </p>
                        <div className="flex items-start gap-2 rounded-md border p-3">
                          <Checkbox
                            id="delete_linked_docs"
                            checked={deleteLinkedDocs}
                            onCheckedChange={(checked) =>
                              setDeleteLinkedDocs(checked === true)
                            }
                          />
                          <label
                            htmlFor="delete_linked_docs"
                            className="text-sm leading-tight"
                          >
                            Delete linked documents (only those not shared with
                            other bots). Shared documents will be kept.
                          </label>
                        </div>
                        <DialogFooter className="mt-4">
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                          >
                            {deleting ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Delete
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-2 py-8">
              <Button
                variant="outline"
                type="button"
                onClick={handleCancel}
                disabled={loading || isPending}
                size="lg"
              >
                Cancel
              </Button>
              <Button size="lg" type="submit" disabled={loading || isPending}>
                {loading || isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </form>
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discard changes?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              You have unsaved changes. Save before leaving, or discard them.
            </p>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
              >
                Keep editing
              </Button>
              <Button variant="outline" onClick={confirmDiscard}>
                Discard changes
              </Button>
              <Button
                onClick={confirmSaveAndLeave}
                disabled={loading || isPending}
              >
                Save and continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
