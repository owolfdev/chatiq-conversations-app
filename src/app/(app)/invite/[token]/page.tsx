import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AcceptInviteForm } from "@/app/(app)/invite/[token]/accept-invite-form";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type InviteStatus = "pending" | "expired" | "cancelled" | "accepted";

interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

function resolveStatus(invite: {
  expires_at: string | null;
  accepted_at: string | null;
  cancelled_at: string | null;
}): InviteStatus {
  if (invite.accepted_at) {
    return "accepted";
  }
  if (invite.cancelled_at) {
    return "cancelled";
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return "expired";
  }
  return "pending";
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("bot_team_invites")
    .select(
      `
        id,
        email,
        role,
        expires_at,
        accepted_at,
        cancelled_at,
        created_at,
        team:bot_teams(name)
      `
    )
    .eq("token", token)
    .maybeSingle();

  const normalizedInvite = invite
    ? {
        ...invite,
        team: Array.isArray(invite.team)
          ? invite.team[0] ?? null
          : invite.team ?? null,
      }
    : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!normalizedInvite) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-16 dark:bg-zinc-950">
        <Card className="max-w-md border border-zinc-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Invite not found</CardTitle>
            <CardDescription>
              The invitation link you followed is invalid or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const status = resolveStatus(normalizedInvite);
  const expiresIn =
    normalizedInvite.expires_at && status === "pending"
      ? formatDistanceToNow(new Date(normalizedInvite.expires_at), {
          addSuffix: true,
        })
      : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-16 dark:bg-zinc-950">
      <Card className="w-full max-w-lg border border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Join {normalizedInvite.team?.name ?? "this team"}</CardTitle>
          <CardDescription>
            {status === "pending"
              ? "Accept the invitation to access shared bots, documents, and analytics."
              : "This invitation is no longer active."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm text-zinc-500">Invited email</p>
                <p className="font-medium">{normalizedInvite.email}</p>
              </div>
              <Badge className="bg-emerald-600">{normalizedInvite.role}</Badge>
            </div>
            {expiresIn && (
              <p className="mt-2 text-sm text-zinc-500">Expires {expiresIn}</p>
            )}
          </div>

          {status !== "pending" && (
            <Alert>
              <AlertTitle>
                {status === "expired"
                  ? "Invite expired"
                  : status === "cancelled"
                    ? "Invite cancelled"
                    : "Invite already accepted"}
              </AlertTitle>
              <AlertDescription>
                {status === "expired" &&
                  "This invitation has expired. Ask the team admin to send a new one."}
                {status === "cancelled" &&
                  "This invitation was cancelled by a team admin."}
                {status === "accepted" &&
                  "This invitation was already accepted."}
              </AlertDescription>
            </Alert>
          )}

          {status === "pending" && !user && (
            <Alert>
              <AlertTitle>Sign in to continue</AlertTitle>
              <AlertDescription>
                Please sign in with the invited email address to accept the
                invitation.
              </AlertDescription>
            </Alert>
          )}

          {status === "pending" && user && (
            <AcceptInviteForm
              token={token}
              teamName={normalizedInvite.team?.name ?? "this team"}
              role={normalizedInvite.role}
              inviteEmail={normalizedInvite.email}
              userEmail={user.email ?? ""}
            />
          )}

          {status !== "pending" && (
            <Button asChild className="w-full">
              <Link href="/dashboard">Return to dashboard</Link>
            </Button>
          )}

          {status === "pending" && !user && (
            <Button
              asChild
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Link href={`/sign-in?redirect=/invite/${token}`}>
                Sign in to accept
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
