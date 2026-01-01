"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createApiKey } from "@/app/actions/api/create-api-key";
import { getUserBotsSimple, type SimpleBot } from "@/app/actions/api/get-user-bots-simple";
import { toast } from "sonner";
import { Copy, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateApiKeyDialogProps) {
  const [bots, setBots] = useState<SimpleBot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>("");
  const [label, setLabel] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      getUserBotsSimple().then(setBots);
    } else {
      // Reset state when dialog closes
      setSelectedBotId("");
      setLabel("");
      setCreatedKey(null);
      setCopied(false);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBotId) {
      toast.error("Please select a bot");
      return;
    }

    startTransition(async () => {
      const createToast = toast.loading("Creating API key...", {
        description: "Please wait while we generate your secure API key.",
      });

      const result = await createApiKey({
        botId: selectedBotId,
        label: label.trim() || undefined,
      });

      if (result.success && result.apiKey) {
        toast.success("API key created successfully", {
          id: createToast,
          description: "Your API key has been generated. Copy it now - you won't see it again!",
        });
        setCreatedKey(result.apiKey);
        onSuccess?.();
      } else {
        toast.error("Failed to create API key", {
          id: createToast,
          description: result.error || "An unknown error occurred",
        });
      }
    });
  };

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedBot = bots.find((b) => b.id === selectedBotId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {!createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for authenticating requests to your bot.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="bot">Bot *</Label>
                  <Select
                    value={selectedBotId}
                    onValueChange={setSelectedBotId}
                    disabled={isPending}
                  >
                    <SelectTrigger id="bot">
                      <SelectValue placeholder="Select a bot" />
                    </SelectTrigger>
                    <SelectContent>
                      {bots.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No bots available
                        </SelectItem>
                      ) : (
                        bots.map((bot) => (
                          <SelectItem key={bot.id} value={bot.id}>
                            {bot.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label">Label (Optional)</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g., Production API Key"
                    disabled={isPending}
                  />
                  <p className="text-xs text-zinc-500">
                    Add a label to help identify this key later
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || !selectedBotId}>
                  {isPending ? "Creating..." : "Generate Key"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription>
                Your API key has been generated. Copy it now - you won't be able to see it again!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This is the only time you'll see this key. Make sure to copy and store it securely.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={createdKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyKey}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {selectedBot && (
                  <p className="text-xs text-zinc-500">
                    For bot: <span className="font-medium">{selectedBot.name}</span>
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

