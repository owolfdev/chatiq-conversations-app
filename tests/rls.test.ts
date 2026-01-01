import { describe, expect, it, vi, afterEach } from "vitest";

import { getUserTeamId } from "@/lib/teams/get-user-team-id";

type SupabaseResponse = {
  data: unknown;
  error: unknown;
};

const createClientMock = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

// Mock Next.js cookies() function
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: null })),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

function createSupabaseStub(responses: Record<string, SupabaseResponse[]>) {
  const tableCallCounts: Record<string, number> = {};

  return {
    from(table: string) {
      tableCallCounts[table] = (tableCallCounts[table] ?? 0) + 1;
      const callIndex = tableCallCounts[table] - 1;
      const tableResponses = responses[table] ?? [];
      const nextResponse =
        tableResponses[callIndex] ?? { data: null, error: null };

      const createQueryBuilder = () => ({
        eq: () => createQueryBuilder(),
        order: () => createQueryBuilder(),
        limit: () => ({
          single: () => Promise.resolve(nextResponse),
          maybeSingle: () => Promise.resolve(nextResponse),
        }),
        single: () => Promise.resolve(nextResponse),
        maybeSingle: () => Promise.resolve(nextResponse),
      });

      return {
        select: () => createQueryBuilder(),
      };
    },
  };
}

describe("getUserTeamId", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    createClientMock.mockReset();
  });

  it("returns team from membership before ownership", async () => {
    const supabaseStub = createSupabaseStub({
      bot_team_members: [
        { data: { team_id: "team-member" }, error: null },
      ],
    });
    createClientMock.mockResolvedValueOnce(supabaseStub);

    const teamId = await getUserTeamId("user-123");
    expect(teamId).toBe("team-member");
  });

  it("falls back to owned team when membership missing", async () => {
    const supabaseStub = createSupabaseStub({
      bot_team_members: [{ data: null, error: null }],
      bot_teams: [{ data: { id: "team-owner" }, error: null }],
    });
    createClientMock.mockResolvedValueOnce(supabaseStub);

    const teamId = await getUserTeamId("user-456");
    expect(teamId).toBe("team-owner");
  });

  it("returns null when no team found", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const supabaseStub = createSupabaseStub({
      bot_team_members: [{ data: null, error: null }],
      bot_teams: [{ data: null, error: null }],
    });
    createClientMock.mockResolvedValueOnce(supabaseStub);

    const teamId = await getUserTeamId("user-789");
    expect(teamId).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

