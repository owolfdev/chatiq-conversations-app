"use client";

import { useEffect, useState } from "react";
import { getUserApiKeys } from "@/app/actions/api/api-keys";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Key, Plus, Check, ExternalLink } from "lucide-react";
import { DeleteApiKeyDialog } from "./delete-api-key-dialog";
import { CreateApiKeyDialog } from "./create-api-key-dialog";
import { CreateSystemSharedKeyDialog } from "./create-system-shared-key-dialog";
import { toast } from "sonner";
import Link from "next/link";
import { Shield } from "lucide-react";

type ApiKey = {
  id: string;
  label: string;
  key: string;
  created_at: string;
  active: boolean;
};

interface ApiKeysClientProps {
  initialApiKeys: ApiKey[];
  teamName: string | null;
  isAdmin?: boolean;
}

export default function ApiKeysClient({
  initialApiKeys,
  teamName,
  isAdmin = false,
}: ApiKeysClientProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialApiKeys);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createSystemKeyDialogOpen, setCreateSystemKeyDialogOpen] =
    useState(false);

  // Update when props change (e.g., team switch)
  useEffect(() => {
    setApiKeys(initialApiKeys);
  }, [initialApiKeys]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKeyId(null), 1500);
  };

  const loadApiKeys = () => {
    getUserApiKeys()
      .then(setApiKeys)
      .catch((error) => {
        console.error("Failed to load API keys:", error);
        toast.error("Failed to load API keys");
      });
  };

  const handleCreateSuccess = () => {
    loadApiKeys();
  };

  return (
    <>
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">API Keys</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              {teamName
                ? `Manage API keys for ${teamName} to integrate with external applications.`
                : "Manage your API keys for integrating with external applications. Switch teams from the header to view different workspaces."}
            </p>
            {teamName && (
              <div className="mt-2">
                <Badge variant="outline" className="text-sm">
                  {teamName}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {isAdmin && (
              <Button
                onClick={() => setCreateSystemKeyDialogOpen(true)}
                variant="outline"
                className="border-amber-600 text-amber-600 hover:bg-amber-50 dark:border-amber-500 dark:text-amber-500 dark:hover:bg-amber-950"
              >
                <Shield className="h-4 w-4 mr-2" />
                System Shared Key
              </Button>
            )}
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Key
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Learn how to use your API keys to integrate with our platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-zinc-50 rounded-lg dark:bg-zinc-800">
              <h4 className="font-medium mb-2">Authentication</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                Include your API key in the Authorization header:
              </p>
              <pre className="block p-3 bg-zinc-900 text-zinc-100 rounded text-sm font-mono overflow-x-auto">
                <code>{`curl -X POST https://chatiq.io/api/chat \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"message": "Hello", "bot_slug": "your-bot-slug", "stream": false}'`}</code>
              </pre>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="https://www.chatiq.io/docs/api" target="_blank">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  View Documentation
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="https://www.chatiq.io/docs/api" target="_blank">
                  API Reference
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {apiKey.label || "Unnamed Key"}
                  </CardTitle>
                  <Badge variant={apiKey.active ? "default" : "secondary"}>
                    {apiKey.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>
                  Created {new Date(apiKey.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label>API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={apiKey.key}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                    >
                      {copiedKeyId === apiKey.id ? (
                        <Check className="h-4 w-4 text-green-600 transition-all duration-150" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    API keys are masked for security. Full keys are only shown
                    once when created.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <DeleteApiKeyDialog
                  id={apiKey.id}
                  label={apiKey.label}
                  onSuccess={loadApiKeys}
                />
              </CardFooter>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Security Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <h4 className="font-medium">Best Practices:</h4>
            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 ml-4">
              <li>
                • Never share your API keys publicly or commit them to version
                control
              </li>
              <li>
                • Use environment variables to store API keys in your
                applications
              </li>
              <li>• Regenerate keys regularly and when team members leave</li>
              <li>• Use different keys for different environments</li>
              <li>• Monitor API key usage and revoke unused keys</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      <CreateApiKeyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
      {isAdmin && (
        <CreateSystemSharedKeyDialog
          open={createSystemKeyDialogOpen}
          onOpenChange={setCreateSystemKeyDialogOpen}
          onSuccess={handleCreateSuccess}
        />
      )}
    </>
  );
}
