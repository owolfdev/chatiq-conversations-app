export type TeamRole = "owner" | "admin" | "member";

export interface TeamMemberSummary {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: TeamRole;
  joinedAt: string;
  avatarUrl?: string | null;
}

export type TeamInviteRole = "admin" | "member";

export interface TeamInviteSummary {
  id: string;
  email: string;
  role: TeamInviteRole;
  sentAt: string;
  expiresAt: string | null;
}

