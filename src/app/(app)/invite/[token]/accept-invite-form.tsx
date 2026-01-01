"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface AcceptInviteFormProps {
  token: string;
  teamName: string;
  role: "admin" | "member";
  inviteEmail: string;
  userEmail: string;
}

export function AcceptInviteForm({
  token,
  teamName,
  role,
  inviteEmail,
  userEmail,
}: AcceptInviteFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const emailsMatch =
    userEmail?.toLowerCase() === inviteEmail.toLowerCase() && !!userEmail;

  const handleAccept = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/team/invites/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload?.error?.message ?? "Failed to accept the invitation.";
        setError(message);
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      router.push("/dashboard/team");
    } catch (requestError) {
      console.error("Failed to accept invite", requestError);
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!emailsMatch && (
        <Alert>
          <AlertTitle>Switch accounts to continue</AlertTitle>
          <AlertDescription>
            This invite was sent to <strong>{inviteEmail}</strong>, but you are
            signed in as <strong>{userEmail}</strong>. Please sign out and sign
            back in with the invited email address before accepting.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not accept invite</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertTitle>Invite accepted</AlertTitle>
          <AlertDescription>
            You have joined <strong>{teamName}</strong>. Redirecting you to the
            dashboard...
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleAccept}
        disabled={!emailsMatch || isSubmitting || success}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        {isSubmitting && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        Accept invitation as {role}
      </Button>
    </div>
  );
}

