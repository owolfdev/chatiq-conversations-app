"use client";

import { useState, useTransition } from "react";
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
import { createSystemSharedPublicApiKey } from "@/app/actions/api/create-shared-public-api-key";
import { toast } from "sonner";
import { Copy, Check, AlertCircle, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateSystemSharedKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateSystemSharedKeyDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateSystemSharedKeyDialogProps) {
  const [label, setLabel] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const createToast = toast.loading("Creating system shared API key...", {
        description: "Please wait while we generate your secure API key.",
      });

      const result = await createSystemSharedPublicApiKey({
        label: label.trim() || undefined,
      });

      if (result.success && result.apiKey) {
        toast.success("System shared API key created successfully", {
          id: createToast,
          description: "Your API key has been generated. Copy it now - you won't see it again!",
        });
        setCreatedKey(result.apiKey);
        onSuccess?.();
      } else {
        toast.error("Failed to create system shared API key", {
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

  const handleClose = () => {
    setLabel("");
    setCreatedKey(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {!createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-600" />
                Create System Shared API Key
              </DialogTitle>
              <DialogDescription>
                Generate a system-level API key that can access any public bot across all teams.
                This key is for platform admin use only.
              </DialogDescription>
            </DialogHeader>
            <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Admin Only:</strong> This key can access any public bot on the platform.
                Use with caution and keep it secure.
              </AlertDescription>
            </Alert>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Label (Optional)</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g., External App - Public Bots"
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
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating..." : "Generate System Key"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>System Shared API Key Created</DialogTitle>
              <DialogDescription>
                Your system shared API key has been generated. Copy it now - you won't be able to see it again!
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
                <Label>System Shared API Key</Label>
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
                <p className="text-xs text-zinc-500">
                  This key can access any public bot across all teams. Each bot's quota is tracked separately.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}



