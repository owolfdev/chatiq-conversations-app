"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, ExternalLink, Pencil, Plug, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Provider = "line" | "facebook" | "whatsapp";

type BotOption = {
  id: string;
  name: string | null;
  slug: string | null;
};

type Integration = {
  id: string;
  bot_id: string;
  provider: Provider;
  status: string;
  display_name: string | null;
  credentials: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  bot: { name?: string | null; slug?: string | null } | null;
};

type IntegrationsClientProps = {
  teamName: string | null;
  initialBots: BotOption[];
  initialIntegrations: Integration[];
};

const PROVIDER_LABELS: Record<Provider, string> = {
  line: "LINE",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
};

const FORM_PLACEHOLDERS = {
  channelId: "e.g. 2001234567",
  channelSecret: "e.g. 95be...",
  channelAccessToken: "e.g. KqX...",
};

function maskSecretValue(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return "****";
  }
  const last4 = value.slice(-4);
  return `****${last4}`;
}

function formatDate(value: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString();
}

function getCredentialValue(
  credentials: Record<string, unknown>,
  key: string
) {
  const value = credentials[key];
  if (value === undefined || value === null) return "--";
  return String(value);
}

export default function IntegrationsClient({
  teamName,
  initialBots,
  initialIntegrations,
}: IntegrationsClientProps) {
  const [activeProvider, setActiveProvider] = useState<Provider>("line");
  const [integrations, setIntegrations] =
    useState<Integration[]>(initialIntegrations);
  const [bots, setBots] = useState<BotOption[]>(initialBots);
  const [isCreating, setIsCreating] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [lastCreatedIntegrationId, setLastCreatedIntegrationId] = useState<
    string | null
  >(null);

  const [botId, setBotId] = useState<string>("");
  const [channelId, setChannelId] = useState("");
  const [channelSecret, setChannelSecret] = useState("");
  const [channelAccessToken, setChannelAccessToken] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setIntegrations(initialIntegrations);
  }, [initialIntegrations]);

  useEffect(() => {
    setBots(initialBots);
  }, [initialBots]);

  const appUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return base.endsWith("/") ? base.slice(0, -1) : base;
  }, []);

  const lineIntegrations = useMemo(
    () => integrations.filter((item) => item.provider === "line"),
    [integrations]
  );
  const lineBotIds = useMemo(
    () => new Set(lineIntegrations.map((item) => item.bot_id)),
    [lineIntegrations]
  );

  const providerIntegrations = useMemo(
    () => integrations.filter((item) => item.provider === activeProvider),
    [integrations, activeProvider]
  );

  const lineWebhookUrl = useMemo(() => {
    if (!lastCreatedIntegrationId) return null;
    return `${appUrl}/api/integrations/line/webhook/${lastCreatedIntegrationId}`;
  }, [appUrl, lastCreatedIntegrationId]);

  const loadIntegrations = async () => {
    try {
      const response = await fetch("/api/integrations");
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error?.message ?? "Failed to load integrations."
        );
      }
      const payload = await response.json();
      setIntegrations(payload.integrations ?? []);
    } catch (error) {
      console.error("Failed to load integrations", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load integrations."
      );
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard.`);
    } catch (error) {
      console.error("Failed to copy to clipboard", error);
      toast.error("Failed to copy.");
    }
  };

  const handleCreateLineIntegration = async () => {
    const nextErrors: Record<string, string> = {};
    if (!botId) {
      nextErrors.botId = "Select a bot to connect.";
    }
    if (!channelId.trim()) {
      nextErrors.channelId = "Channel ID is required.";
    }
    if (!channelSecret.trim()) {
      nextErrors.channelSecret = "Channel secret is required.";
    }
    if (!channelAccessToken.trim()) {
      nextErrors.channelAccessToken = "Channel access token is required.";
    }
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please complete the required fields.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "line",
          bot_id: botId,
          status: "active",
          credentials: {
            channel_id: channelId.trim(),
            channel_secret: channelSecret.trim(),
            channel_access_token: channelAccessToken.trim(),
          },
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.error?.message ?? "Failed to create integration."
        );
      }

      const integrationId = payload?.integration?.id as string | undefined;
      setLastCreatedIntegrationId(integrationId ?? null);
      toast.success("LINE integration created.");
      setBotId("");
      setChannelId("");
      setChannelSecret("");
      setChannelAccessToken("");
      setFormErrors({});
      await loadIntegrations();
    } catch (error) {
      console.error("Failed to create integration", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create integration."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (integration: Integration) => {
    const nextStatus = integration.status === "active" ? "disabled" : "active";
    setMutatingId(integration.id);
    try {
      const response = await fetch(`/api/integrations/${integration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.error?.message ?? "Failed to update integration."
        );
      }
      toast.success(
        nextStatus === "active" ? "Integration enabled." : "Integration disabled."
      );
      await loadIntegrations();
    } catch (error) {
      console.error("Failed to update integration", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update integration."
      );
    } finally {
      setMutatingId(null);
    }
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    setMutatingId(integrationId);
    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.error?.message ?? "Failed to delete integration."
        );
      }
      toast.success("Integration deleted.");
      await loadIntegrations();
    } catch (error) {
      console.error("Failed to delete integration", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete integration."
      );
    } finally {
      setMutatingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Integrations</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Connect team bots to external channels and messaging platforms.
          </p>
          {teamName && (
            <Badge variant="outline" className="mt-3">
              {teamName}
            </Badge>
          )}
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/team">
            <Plug className="mr-2 h-4 w-4" />
            Team Settings
          </Link>
        </Button>
      </div>

      <Tabs
        defaultValue="line"
        value={activeProvider}
        onValueChange={(value) => setActiveProvider(value as Provider)}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="line">LINE</TabsTrigger>
          <TabsTrigger value="facebook">Facebook</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="line" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add LINE Integration</CardTitle>
              <CardDescription>
                Connect a LINE Official Account to a specific bot.{" "}
                <Link
                  href="/dev_docs/line-integration.md"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                >
                  View setup guide
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="line-bot-select">Select bot</Label>
                  <Select value={botId} onValueChange={setBotId}>
                    <SelectTrigger
                      id="line-bot-select"
                      className={cn(formErrors.botId && "border-red-500")}
                    >
                      <SelectValue placeholder="Choose a bot" />
                    </SelectTrigger>
                    <SelectContent>
                      {bots.map((bot) => (
                        <SelectItem
                          key={bot.id}
                          value={bot.id}
                          disabled={lineBotIds.has(bot.id)}
                        >
                          {bot.name || bot.slug || "Untitled bot"}
                          {lineBotIds.has(bot.id) ? " (already connected)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.botId && (
                    <p className="text-xs text-red-500">{formErrors.botId}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line-channel-id">Channel ID</Label>
                  <Input
                    id="line-channel-id"
                    value={channelId}
                    onChange={(event) => setChannelId(event.target.value)}
                    placeholder={FORM_PLACEHOLDERS.channelId}
                    className={cn(formErrors.channelId && "border-red-500")}
                  />
                  {formErrors.channelId && (
                    <p className="text-xs text-red-500">
                      {formErrors.channelId}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line-channel-secret">Channel Secret</Label>
                  <Input
                    id="line-channel-secret"
                    value={channelSecret}
                    onChange={(event) => setChannelSecret(event.target.value)}
                    placeholder={FORM_PLACEHOLDERS.channelSecret}
                    className={cn(formErrors.channelSecret && "border-red-500")}
                  />
                  {formErrors.channelSecret && (
                    <p className="text-xs text-red-500">
                      {formErrors.channelSecret}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line-channel-access-token">
                    Channel Access Token
                  </Label>
                  <Input
                    id="line-channel-access-token"
                    value={channelAccessToken}
                    onChange={(event) =>
                      setChannelAccessToken(event.target.value)
                    }
                    placeholder={FORM_PLACEHOLDERS.channelAccessToken}
                    className={cn(
                      formErrors.channelAccessToken && "border-red-500"
                    )}
                  />
                  {formErrors.channelAccessToken && (
                    <p className="text-xs text-red-500">
                      {formErrors.channelAccessToken}
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleCreateLineIntegration}
                disabled={isCreating}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                {isCreating ? "Saving..." : "Save LINE Integration"}
              </Button>
            </CardContent>
          </Card>

          {lineWebhookUrl && (
            <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <CardHeader>
                <CardTitle>LINE Webhook URL</CardTitle>
                <CardDescription>
                  Add this webhook URL in the LINE Messaging API console.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input readOnly value={lineWebhookUrl} className="font-mono" />
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      copyToClipboard(lineWebhookUrl, "Webhook URL")
                    }
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setLastCreatedIntegrationId(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <IntegrationsTable
            integrations={lineIntegrations}
            provider="line"
            onToggleStatus={handleToggleStatus}
            onDelete={handleDeleteIntegration}
            mutatingId={mutatingId}
            onRefresh={loadIntegrations}
            webhookBaseUrl={`${appUrl}/api/integrations/line/webhook`}
          />
        </TabsContent>

        <TabsContent value="facebook" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Facebook Messenger</CardTitle>
              <CardDescription>
                Facebook Messenger integrations are coming next. Set up the tab
                now so your team can manage them here when ready.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Need to prepare early? Reach out and we can help plan the setup.
              </p>
            </CardContent>
          </Card>
          <IntegrationsTable
            integrations={providerIntegrations}
            provider="facebook"
            onToggleStatus={handleToggleStatus}
            onDelete={handleDeleteIntegration}
            mutatingId={mutatingId}
            onRefresh={loadIntegrations}
            webhookBaseUrl={null}
          />
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>
                WhatsApp integrations will live here once the Cloud API setup is
                complete.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We will add templates, numbers, and verification settings here.
              </p>
            </CardContent>
          </Card>
          <IntegrationsTable
            integrations={providerIntegrations}
            provider="whatsapp"
            onToggleStatus={handleToggleStatus}
            onDelete={handleDeleteIntegration}
            mutatingId={mutatingId}
            onRefresh={loadIntegrations}
            webhookBaseUrl={null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type IntegrationsTableProps = {
  integrations: Integration[];
  provider: Provider;
  mutatingId: string | null;
  webhookBaseUrl: string | null;
  onToggleStatus: (integration: Integration) => Promise<void>;
  onDelete: (integrationId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
};

function IntegrationsTable({
  integrations,
  provider,
  mutatingId,
  webhookBaseUrl,
  onToggleStatus,
  onDelete,
  onRefresh,
}: IntegrationsTableProps) {
  const [editingIntegration, setEditingIntegration] =
    useState<Integration | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{PROVIDER_LABELS[provider]} Integrations</CardTitle>
        <CardDescription>
          {integrations.length === 0
            ? "No integrations yet."
            : `Manage existing ${PROVIDER_LABELS[provider]} connections.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {integrations.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            {provider === "line"
              ? "No integrations configured. Add one above to get started."
              : "No integrations configured yet."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Integration</TableHead>
                <TableHead>Bot</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrations.map((integration) => {
                const isMutating = mutatingId === integration.id;
                const displayName =
                  integration.display_name || PROVIDER_LABELS[integration.provider];
                const channelId = getCredentialValue(
                  integration.credentials,
                  "channel_id"
                );
                const channelSecret = maskSecretValue(
                  integration.credentials.channel_secret
                );
                const channelToken = maskSecretValue(
                  integration.credentials.channel_access_token
                );

                return (
                  <TableRow key={integration.id}>
                    <TableCell>
                      <div className="font-medium">{displayName}</div>
                      {provider === "line" && (
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <div>Channel ID: {channelId}</div>
                          <div>Channel Secret: {channelSecret}</div>
                          <div>Access Token: {channelToken}</div>
                          {webhookBaseUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() =>
                                navigator.clipboard
                                  .writeText(
                                    `${webhookBaseUrl}/${integration.id}`
                                  )
                                  .then(() =>
                                    toast.success("Webhook URL copied.")
                                  )
                                  .catch(() => toast.error("Copy failed."))
                              }
                            >
                              <Copy className="mr-1 h-3 w-3" />
                              Copy webhook URL
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {integration.bot?.name ||
                        integration.bot?.slug ||
                        "Unknown bot"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          integration.status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {integration.status === "active"
                          ? "Active"
                          : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(integration.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {provider === "line" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingIntegration(integration)}
                            disabled={isMutating}
                          >
                            <Pencil className="mr-2 h-3 w-3" />
                            Edit
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onToggleStatus(integration)}
                          disabled={isMutating}
                        >
                          {integration.status === "active" ? "Disable" : "Enable"}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isMutating}
                            >
                              <Trash2 className="mr-2 h-3 w-3" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete integration?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the integration and stop all
                                incoming messages for this channel. This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(integration.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {editingIntegration && (
        <EditLineIntegrationDialog
          integration={editingIntegration}
          open={!!editingIntegration}
          onOpenChange={(open) => {
            if (!open) {
              setEditingIntegration(null);
            }
          }}
          onUpdated={onRefresh}
        />
      )}
    </Card>
  );
}

type EditLineIntegrationDialogProps = {
  integration: Integration;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => Promise<void>;
};

function EditLineIntegrationDialog({
  integration,
  open,
  onOpenChange,
  onUpdated,
}: EditLineIntegrationDialogProps) {
  const [channelId, setChannelId] = useState("");
  const [channelSecret, setChannelSecret] = useState("");
  const [channelAccessToken, setChannelAccessToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const currentId = getCredentialValue(
        integration.credentials,
        "channel_id"
      );
      setChannelId(currentId === "--" ? "" : currentId);
      setChannelSecret("");
      setChannelAccessToken("");
      setError(null);
    }
  }, [open, integration]);

  const currentSecret = maskSecretValue(integration.credentials.channel_secret);
  const currentToken = maskSecretValue(
    integration.credentials.channel_access_token
  );

  const handleSave = async () => {
    setError(null);
    const credentials: Record<string, string> = {};
    const trimmedId = channelId.trim();
    const trimmedSecret = channelSecret.trim();
    const trimmedToken = channelAccessToken.trim();

    if (trimmedId && trimmedId !== getCredentialValue(integration.credentials, "channel_id")) {
      credentials.channel_id = trimmedId;
    }
    if (trimmedSecret) {
      credentials.channel_secret = trimmedSecret;
    }
    if (trimmedToken) {
      credentials.channel_access_token = trimmedToken;
    }

    if (Object.keys(credentials).length === 0) {
      setError("Add at least one updated credential before saving.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/integrations/${integration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.error?.message ?? "Failed to update integration."
        );
      }

      toast.success("Integration updated.");
      await onUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update integration", error);
      const message =
        error instanceof Error ? error.message : "Failed to update integration.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit LINE Integration</DialogTitle>
          <DialogDescription>
            Rotate credentials or update the channel ID. Leave fields blank to
            keep existing values.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-channel-id">Channel ID</Label>
            <Input
              id="edit-channel-id"
              value={channelId}
              onChange={(event) => setChannelId(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-channel-secret">Channel Secret</Label>
            <Input
              id="edit-channel-secret"
              value={channelSecret}
              onChange={(event) => setChannelSecret(event.target.value)}
              placeholder="Enter new secret"
            />
            <p className="text-xs text-muted-foreground">
              Current: {currentSecret}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-channel-access-token">
              Channel Access Token
            </Label>
            <Input
              id="edit-channel-access-token"
              value={channelAccessToken}
              onChange={(event) => setChannelAccessToken(event.target.value)}
              placeholder="Enter new token"
            />
            <p className="text-xs text-muted-foreground">
              Current: {currentToken}
            </p>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
