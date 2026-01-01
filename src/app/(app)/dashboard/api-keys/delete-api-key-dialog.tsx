// src/app/dashboard/api-keys/delete-api-key-dialog.tsx
"use client";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useTransition, useState } from "react";
import { deleteApiKey } from "@/app/actions/api/delete-api-key";
import { toast } from "sonner";

type Props = {
  id: string;
  label: string | null;
  onSuccess?: () => void;
};

export function DeleteApiKeyDialog({ id, label, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const deleteToast = toast.loading("Deleting API key...", {
        description: "Please wait while we remove this key.",
      });

      const result = await deleteApiKey(id);

      if (result.success) {
        toast.success("API key deleted successfully", {
          id: deleteToast,
          description: `"${label || "Unnamed Key"}" has been permanently deleted.`,
        });
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error("Failed to delete API key", {
          id: deleteToast,
          description: result.error || "An unknown error occurred",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete API Key</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            Are you sure you want to delete <strong>{label || "this API key"}</strong>?
          </p>
          <p className="text-red-500">This action cannot be undone.</p>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
