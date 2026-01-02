"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check, Loader2, LogOut, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { logout } from "@/app/actions/auth/logout";
import { setActiveTeam } from "@/app/actions/teams/set-active-team";

interface UserData {
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface TeamOption {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
  isPersonal: boolean;
}

async function fetchActiveTeamId(): Promise<string | null> {
  try {
    const response = await fetch("/api/team/active", {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    const payload = await response.json().catch(() => null);
    return typeof payload?.teamId === "string" ? payload.teamId : null;
  } catch (error) {
    console.error("Failed to resolve active team", error);
    return null;
  }
}

export function UserMenu() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        setLoadingTeams(false);
        return;
      }

      const [{ data: profile }, activeTeamFromServer, { data: memberships }] =
        await Promise.all([
          supabase
            .from("bot_user_profiles")
            .select("full_name, avatar_url")
            .eq("id", user.id)
            .single(),
          fetchActiveTeamId(),
          supabase
            .from("bot_team_members")
            .select("team_id, role, bot_teams!inner(name, owner_id)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

      const displayName =
        profile?.full_name?.trim() ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "User";

      setUserData({
        name: displayName,
        email: user.email || "",
        avatarUrl: profile?.avatar_url || null,
      });
      setLoading(false);

      if (!memberships) {
        setTeamError("Unable to load teams.");
        setLoadingTeams(false);
        return;
      }

      const mapped =
        memberships.map((entry: any) => {
          const team = Array.isArray(entry.bot_teams)
            ? entry.bot_teams[0] ?? null
            : entry.bot_teams ?? null;

          return {
            id: entry.team_id,
            name: team?.name ?? "Untitled Team",
            role: (entry.role as TeamOption["role"]) ?? "member",
            isPersonal: team?.owner_id === user.id,
          };
        }) ?? [];

      setTeams(mapped);

      if (activeTeamFromServer && mapped.some((team) => team.id === activeTeamFromServer)) {
        setActiveTeamId(activeTeamFromServer);
      } else if (mapped.length > 0) {
        setActiveTeamId(mapped[0].id);
      } else {
        setActiveTeamId(null);
      }

      setLoadingTeams(false);
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const currentTeam = useMemo(
    () => teams.find((team) => team.id === activeTeamId) ?? null,
    [teams, activeTeamId]
  );

  const handleSelectTeam = (teamId: string) => {
    if (teamId === activeTeamId || isPending) {
      return;
    }

    startTransition(async () => {
      const result = await setActiveTeam(teamId);
      if (!result.success) {
        setTeamError(result.error ?? "Failed to switch teams.");
        return;
      }
      setActiveTeamId(teamId);
      setTeamError(null);
      router.refresh();
    });
  };

  const displayName = userData?.name || "User";
  const displayEmail = userData?.email || "user@example.com";
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  const avatarUrl = userData?.avatarUrl;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          disabled={loading}
          aria-label="Open user menu"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={avatarUrl || undefined} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="grid text-left">
            <span className="truncate text-sm font-semibold">{displayName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {displayEmail}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Team
        </DropdownMenuLabel>
        {loadingTeams && (
          <DropdownMenuItem disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading teams...
          </DropdownMenuItem>
        )}
        {!loadingTeams && teams.length === 0 && (
          <DropdownMenuItem disabled>No teams available.</DropdownMenuItem>
        )}
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onSelect={(event) => {
              event.preventDefault();
              handleSelectTeam(team.id);
            }}
            className="flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{team.name}</div>
              <div className="text-xs text-muted-foreground">
                {team.isPersonal ? "Personal" : team.role}
              </div>
            </div>
            {activeTeamId === team.id ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : null}
          </DropdownMenuItem>
        ))}
        {teamError ? (
          <DropdownMenuItem disabled className="text-destructive">
            {teamError}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
