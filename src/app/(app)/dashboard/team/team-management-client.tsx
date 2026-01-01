"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MoreHorizontal, Plus, Send, Users } from "lucide-react";
import { updateTeamName } from "@/app/actions/teams/update-team-name";
import { updateTeamMemberRole } from "@/app/actions/teams/update-team-member-role";
import { removeTeamMember } from "@/app/actions/teams/remove-team-member";
import Link from "next/link";

import type {
  TeamInviteRole,
  TeamInviteSummary,
  TeamMemberSummary,
  TeamRole,
} from "@/types/teams";

interface TeamManagementClientProps {
  teamId: string;
  currentUserId: string;
  currentUserRole: TeamRole;
  planId: "free" | "pro" | "team" | "enterprise" | "admin";
  seatLimit: number | null;
  initialMembers: TeamMemberSummary[];
  initialInvites: TeamInviteSummary[];
  canManageTeamProfile: boolean;
  initialTeamName: string;
}

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

const ROLE_OPTIONS: TeamRole[] = ["owner", "admin", "member"];

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "owner":
      return "bg-purple-600";
    case "admin":
      return "bg-blue-600";
    default:
      return "bg-emerald-600";
  }
}

export default function TeamManagementClient({
  teamId,
  currentUserId,
  currentUserRole,
  planId,
  seatLimit,
  initialMembers,
  initialInvites,
  canManageTeamProfile,
  initialTeamName,
}: TeamManagementClientProps) {
  const [members, setMembers] = useState<TeamMemberSummary[]>(initialMembers);
  const [invites, setInvites] = useState<TeamInviteSummary[]>(initialInvites);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamInviteRole>("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [teamDisplayName, setTeamDisplayName] = useState(initialTeamName);
  const [teamNameInput, setTeamNameInput] = useState(initialTeamName);
  const [teamNameError, setTeamNameError] = useState<string | null>(null);
  const [teamNameSuccess, setTeamNameSuccess] = useState<string | null>(null);
  const [isUpdatingTeamName, startTeamRenameTransition] = useTransition();
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [memberActionSuccess, setMemberActionSuccess] = useState<string | null>(null);
  const [mutatingMemberId, setMutatingMemberId] = useState<string | null>(null);

  const activeMembers = useMemo(() => members.filter(Boolean), [members]);

  const planAllowsInvites = ["team", "enterprise", "admin"].includes(planId);
  const seatLimitReached =
    seatLimit !== null &&
    activeMembers.length + invites.length >= seatLimit;
  const canInvite =
    (currentUserRole === "owner" || currentUserRole === "admin") &&
    planAllowsInvites &&
    !seatLimitReached;

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  useEffect(() => {
    setInvites(initialInvites);
  }, [initialInvites]);

  useEffect(() => {
    setTeamDisplayName(initialTeamName);
    setTeamNameInput(initialTeamName);
  }, [initialTeamName]);

  const handleMemberRoleChange = useCallback(
    async (memberId: string, targetRole: TeamRole) => {
      setMemberActionError(null);
      setMemberActionSuccess(null);
      setMutatingMemberId(memberId);
      try {
        const result = await updateTeamMemberRole({
          teamId,
          memberId,
          newRole: targetRole,
        });

        if (!result.success) {
          setMemberActionError(result.error ?? "Failed to update member role.");
          return;
        }

        setMembers((prev) =>
          prev.map((member) =>
            member.id === memberId ? { ...member, role: targetRole } : member
          )
        );
        setMemberActionSuccess("Member role updated.");
      } catch (error) {
        console.error("Failed to update member role", error);
        setMemberActionError("Failed to update member role.");
      } finally {
        setMutatingMemberId(null);
      }
    },
    [teamId]
  );

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      setMemberActionError(null);
      setMemberActionSuccess(null);
      setMutatingMemberId(memberId);
      try {
        const result = await removeTeamMember({ teamId, memberId });
        if (!result.success) {
          setMemberActionError(result.error ?? "Failed to remove member.");
          return;
        }
        setMembers((prev) => prev.filter((member) => member.id !== memberId));
        setMemberActionSuccess("Member removed from the team.");
      } catch (error) {
        console.error("Failed to remove member", error);
        setMemberActionError("Failed to remove member.");
      } finally {
        setMutatingMemberId(null);
      }
    },
    [teamId]
  );

  const handleTeamNameSubmit = useCallback(() => {
    if (!canManageTeamProfile) {
      return;
    }

    setTeamNameError(null);
    setTeamNameSuccess(null);

    const trimmed = teamNameInput.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      setTeamNameError("Team name must be between 2 and 60 characters.");
      return;
    }

    startTeamRenameTransition(async () => {
      const result = await updateTeamName(trimmed);
      if (!result.success) {
        setTeamNameError(result.error ?? "Failed to update team name.");
        return;
      }
      setTeamDisplayName(trimmed);
      setTeamNameSuccess("Team name updated successfully.");
    });
  }, [canManageTeamProfile, teamNameInput]);

  const handleInvite = useCallback(async () => {
    if (!inviteEmail || !canInvite) {
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const response = await fetch("/api/team/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error?.message ?? "Failed to send invitation."
        );
      }

      const { invite } = (await response.json()) as {
        invite: TeamInviteSummary;
      };

      setInvites((prev) => [invite, ...prev]);
      setInviteEmail("");
      setInviteRole("member");
      setFormSuccess(`Invitation sent to ${invite.email}`);
    } catch (error) {
      console.error("Failed to send invite", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to send invitation."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [inviteEmail, inviteRole, canInvite]);

  const handleCancelInvite = useCallback(
    async (inviteId: string) => {
      setCancelError(null);
      try {
        const response = await fetch(`/api/team/invites/${inviteId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            payload?.error?.message ?? "Failed to cancel invitation."
          );
        }
        setInvites((prev) => prev.filter((invite) => invite.id !== inviteId));
      } catch (error) {
        console.error("Failed to cancel invite", error);
        setCancelError(
          error instanceof Error
            ? error.message
            : "Failed to cancel invitation."
        );
      }
    },
    []
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold">Team Management</h1>
              <p className="text-zinc-600 dark:text-zinc-400">
                Manage {teamDisplayName} members and roles
              </p>
            </div>
            <Badge
              variant="secondary"
              className="flex items-center gap-1 text-sm"
            >
              <Users className="h-3 w-3" />
              {activeMembers.length} Active members
            </Badge>
          </div>

          {canManageTeamProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Team Details</CardTitle>
                <CardDescription>
                  Update the workspace name shown to your teammates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Team Name</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="team-name"
                      value={teamNameInput}
                      maxLength={60}
                      onChange={(event) => {
                        setTeamNameInput(event.target.value);
                        setTeamNameError(null);
                        setTeamNameSuccess(null);
                      }}
                      disabled={isUpdatingTeamName}
                    />
                    <Button
                      onClick={handleTeamNameSubmit}
                      disabled={
                        isUpdatingTeamName ||
                        teamNameInput.trim() === teamDisplayName.trim()
                      }
                    >
                      {isUpdatingTeamName ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    2–60 characters. This name appears in the team switcher and
                    invitations.
                  </p>
                </div>
                {teamNameError && (
                  <Alert variant="destructive">
                    <AlertTitle>Could not update name</AlertTitle>
                    <AlertDescription>{teamNameError}</AlertDescription>
                  </Alert>
                )}
                {teamNameSuccess && (
                  <Alert>
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>{teamNameSuccess}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Manage channel connections for this team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link href="/dashboard/team/integrations">
                  Configure integrations
                </Link>
              </Button>
            </CardContent>
          </Card>

          {planAllowsInvites ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Invite Team Member
                </CardTitle>
                <CardDescription>
                  {seatLimitReached
                    ? "Seat limit reached. Upgrade to add more teammates."
                    : canInvite
                    ? "Send an invitation to add a new member to your team"
                    : "You need admin access to invite teammates."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      disabled={!canInvite || isSubmitting}
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                    />
                  </div>
                  <div className="w-full space-y-2 md:w-40">
                    <Label>Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(value: TeamInviteRole) =>
                        setInviteRole(value)
                      }
                      disabled={!canInvite || isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleInvite}
                      disabled={!canInvite || isSubmitting || !inviteEmail}
                      className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Send Invite
                    </Button>
                  </div>
                </div>

                {formError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Invite failed</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                {formSuccess && (
                  <Alert className="mt-4">
                    <AlertTitle>Invitation sent</AlertTitle>
                    <AlertDescription>{formSuccess}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage current team members and their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
          {memberActionError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Action failed</AlertTitle>
              <AlertDescription>{memberActionError}</AlertDescription>
            </Alert>
          )}
          {memberActionSuccess && (
            <Alert className="mb-4">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{memberActionSuccess}</AlertDescription>
            </Alert>
          )}
              <div className="space-y-4">
                {activeMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={member.avatarUrl ?? undefined}
                          alt={member.name ?? member.email}
                        />
                        <AvatarFallback>
                          {(() => {
                            const source =
                              member.name?.trim() || member.email || "NA";
                            return source
                              .split(/[\s@._-]+/)
                              .filter(Boolean)
                              .map((segment) => segment[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase();
                          })()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.name ?? member.email}
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {member.email}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-500">
                          Joined{" "}
                          {formatDistanceToNow(new Date(member.joinedAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-3 sm:justify-end">
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleBadgeColor(member.role)}>
                          {ROLE_LABELS[member.role]}
                        </Badge>
                        <Badge variant="secondary">Active</Badge>
                      </div>
                      {currentUserRole === "owner" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={mutatingMemberId === member.id}
                            >
                              {mutatingMemberId === member.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Change role</DropdownMenuLabel>
                            {ROLE_OPTIONS.map((roleOption) => (
                              <DropdownMenuItem
                                key={roleOption}
                                disabled={
                                  member.role === roleOption ||
                                  member.userId === currentUserId
                                }
                                onClick={() =>
                                  handleMemberRoleChange(member.id, roleOption)
                                }
                              >
                                {ROLE_LABELS[roleOption]}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              disabled={member.userId === currentUserId}
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              Remove member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {planAllowsInvites &&
            (currentUserRole === "owner" || currentUserRole === "admin") && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Invites</CardTitle>
                <CardDescription>
                  Invitations that haven&apos;t been accepted yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cancelError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTitle>Could not cancel invite</AlertTitle>
                    <AlertDescription>{cancelError}</AlertDescription>
                  </Alert>
                )}

                {invites.length === 0 && (
                  <p className="text-sm text-zinc-500">
                    No pending invitations.
                  </p>
                )}

                <div className="space-y-3">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                    >
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Invited{" "}
                          {formatDistanceToNow(new Date(invite.sentAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getRoleBadgeColor(invite.role)}>
                          {invite.role}
                        </Badge>
                        <Badge variant="secondary">Pending</Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled>
                              Resend Invite (coming soon)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleCancelInvite(invite.id)}
                            >
                              Cancel Invite
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>
                What each role can do in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-3">
                  <Badge className="bg-purple-600">Owner</Badge>
                  <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                    <li>• Full access to all features</li>
                    <li>• Manage billing and subscription</li>
                    <li>• Add or remove team members</li>
                    <li>• Delete the organization</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <Badge className="bg-blue-600">Admin</Badge>
                  <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                    <li>• Manage bots, documents, and API keys</li>
                    <li>• Invite or remove members (non-owners)</li>
                    <li>• View analytics & activity logs</li>
                    <li>• Configure integrations</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <Badge className="bg-emerald-600">Member</Badge>
                  <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                    <li>• Create and update bots</li>
                    <li>• Upload and manage documents</li>
                    <li>• Test and review conversations</li>
                    <li>• View basic analytics</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
    </div>
  );
}
