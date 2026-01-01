"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";
import { setActiveTeam } from "@/app/actions/teams/set-active-team";
import { cn } from "@/lib/utils";

interface TeamOption {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
  isPersonal: boolean;
  createdAt: string;
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

export function TeamSwitcher() {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();

    const fetchTeams = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("Unable to load teams.");
        setLoading(false);
        return;
      }

      const [{ data, error: membershipError }, activeTeamFromServer] =
        await Promise.all([
          supabase
            .from("bot_team_members")
            .select(
              "team_id, role, created_at, bot_teams!inner(name, owner_id)"
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          fetchActiveTeamId(),
        ]);

      if (membershipError) {
        setError("Failed to load teams.");
        setLoading(false);
        return;
      }

      const mapped =
        data?.map((entry: any) => {
          const team = Array.isArray(entry.bot_teams)
            ? entry.bot_teams[0] ?? null
            : entry.bot_teams ?? null;

          return {
            id: entry.team_id,
            name: team?.name ?? "Untitled Team",
            role: (entry.role as TeamOption["role"]) ?? "member",
            isPersonal: team?.owner_id === user.id,
            createdAt: entry.created_at,
          };
        }) ?? [];

      setTeams(mapped);

      if (
        activeTeamFromServer &&
        mapped.some((team) => team.id === activeTeamFromServer)
      ) {
        setActiveTeamId(activeTeamFromServer);
      } else if (mapped.length > 0) {
        setActiveTeamId(mapped[0].id);
      } else {
        setActiveTeamId(null);
      }

      setLoading(false);
    };

    fetchTeams();
  }, []);

  const currentTeam = useMemo(
    () => teams.find((team) => team.id === activeTeamId) ?? null,
    [teams, activeTeamId]
  );

  const handleSelect = (teamId: string) => {
    if (teamId === activeTeamId || isPending) {
      return;
    }

    startTransition(async () => {
      const result = await setActiveTeam(teamId);
      if (!result.success) {
        setError(result.error ?? "Failed to switch teams.");
        return;
      }
      setActiveTeamId(teamId);
      setError(null);
      router.refresh();
    });
  };

  const triggerLabel = currentTeam
    ? currentTeam.name
    : loading
      ? "Loading teams..."
      : "Select team";

  const isDisabled = loading || teams.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isDisabled}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4 opacity-60" />
          )}
          <span className="max-w-[180px] truncate text-sm">{triggerLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64"
        align="end"
        sideOffset={8}
        collisionPadding={8}
      >
        <DropdownMenuLabel>Workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading && (
          <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading teams...
          </div>
        )}
        {!loading && teams.length === 0 && (
          <div className="px-2 py-2 text-sm text-muted-foreground">
            No teams available.
          </div>
        )}
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => handleSelect(team.id)}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-2",
              activeTeamId === team.id ? "bg-muted" : ""
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{team.name}</p>
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {team.role}
                </Badge>
                {team.isPersonal && (
                  <Badge variant="outline" className="text-[10px]">
                    Personal
                  </Badge>
                )}
              </div>
            </div>
            {activeTeamId === team.id && (
              <Check className="h-4 w-4 text-emerald-600" />
            )}
          </DropdownMenuItem>
        ))}
        {error && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 text-xs text-destructive">{error}</div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

