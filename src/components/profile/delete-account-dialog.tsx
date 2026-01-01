// src/components/profile/delete-account-dialog.tsx
"use client";

import { useState, useTransition } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { deleteAccount } from "@/app/actions/auth/delete-account";
import { toast } from "sonner";

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isPending, startTransition] = useTransition();

  const CONFIRMATION_PHRASE = "DELETE MY ACCOUNT";
  const isConfirmed = confirmationText === CONFIRMATION_PHRASE;

  const handleDelete = () => {
    if (!isConfirmed) {
      toast.error("Please type the confirmation phrase exactly as shown");
      return;
    }

    startTransition(async () => {
      try {
        await deleteAccount();
        // Redirect happens in the server action, but show success message just in case
        toast.success("Your account has been deleted successfully");
      } catch (error) {
        console.error("Error deleting account:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to delete account. Please try again or contact support."
        );
        setOpen(false);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
        >
          Delete Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Delete Your Account
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-2">
            <p className="text-sm">
              This action cannot be undone. This will permanently delete your
              account and remove all of your data from our servers.
            </p>

            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                The following data will be permanently deleted:
              </p>
              <ul className="text-xs text-red-700 dark:text-red-400 list-disc list-inside space-y-1">
                <li>Your user profile and account settings</li>
                <li>All your teams and team memberships</li>
                <li>All your bots and their configurations</li>
                <li>All documents and uploaded content</li>
                <li>All conversations and chat history</li>
                <li>All API keys</li>
                <li>All analytics and usage data</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="confirmation" className="text-sm font-medium">
                To confirm, type{" "}
                <span className="font-mono text-red-600 dark:text-red-400">
                  {CONFIRMATION_PHRASE}
                </span>{" "}
                below:
              </Label>
              <Input
                id="confirmation"
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={CONFIRMATION_PHRASE}
                disabled={isPending}
                className="font-mono"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={isPending} onClick={() => setConfirmationText("")}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmed || isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600 dark:bg-red-600 dark:hover:bg-red-700"
          >
            {isPending ? "Deleting..." : "Delete My Account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
