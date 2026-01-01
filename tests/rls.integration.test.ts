import { beforeAll, afterAll, describe, expect, it } from "vitest";
import {
  createAuthedClient,
  resetSeed,
  seedBasicFixtures,
  supabaseService,
  type SeedContext,
} from "./helpers/supabase-test-utils";

let seed: SeedContext | null = null;

beforeAll(async () => {
  seed = await seedBasicFixtures();
});

afterAll(async () => {
  if (seed) {
    await resetSeed(seed);
  }
});

describe("RLS isolation", () => {
  it("allows owner to read their team bot", async () => {
    if (!seed) {
      return;
    }
    const ownerClient = await createAuthedClient(seed.users.owner.email);
    const { data, error } = await ownerClient
      .from("bot_bots")
      .select("id, team_id")
      .eq("id", seed.botAId)
      .single();

    expect(error).toBeNull();
    expect(data?.team_id).toBe(seed.teamAId);
  });

  it("denies member from accessing another team's bot", async () => {
    if (!seed) {
      return;
    }
    const memberClient = await createAuthedClient(seed.users.member.email);
    const { data, error } = await memberClient
      .from("bot_bots")
      .select("id")
      .eq("id", seed.botAId)
      .maybeSingle();

    // RLS should return null/no row for cross-team access
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("allows service role to see everything (baseline)", async () => {
    if (!seed) {
      return;
    }
    const { data, error } = await supabaseService
      .from("bot_bots")
      .select("id, team_id")
      .in("id", [seed.botAId, seed.botBId]);

    expect(error).toBeNull();
    expect(data?.length).toBe(2);
  });

  it("enforces document isolation across teams", async () => {
    if (!seed) {
      return;
    }
    const ownerClient = await createAuthedClient(seed.users.owner.email);
    const memberClient = await createAuthedClient(seed.users.member.email);

    // Owner can read Team A doc
    const { data: ownerDoc, error: ownerErr } = await ownerClient
      .from("bot_documents")
      .select("id, team_id")
      .eq("id", seed.docAId)
      .single();
    expect(ownerErr).toBeNull();
    expect(ownerDoc?.team_id).toBe(seed.teamAId);

    // Member (Team B) cannot read Team A doc
    const { data: memberDoc, error: memberErr } = await memberClient
      .from("bot_documents")
      .select("id")
      .eq("id", seed.docAId)
      .maybeSingle();
    expect(memberErr).toBeNull();
    expect(memberDoc).toBeNull();

    // Member can read Team B doc
    const { data: memberDocOwn, error: memberDocOwnErr } = await memberClient
      .from("bot_documents")
      .select("id, team_id")
      .eq("id", seed.docBId)
      .single();
    expect(memberDocOwnErr).toBeNull();
    expect(memberDocOwn?.team_id).toBe(seed.teamBId);
  });

  it("restricts API keys to their owning team", async () => {
    if (!seed) {
      return;
    }
    const ownerClient = await createAuthedClient(seed.users.owner.email);
    const memberClient = await createAuthedClient(seed.users.member.email);

    // Owner can see their API key
    const { data: ownerKey, error: ownerKeyErr } = await ownerClient
      .from("bot_api_keys")
      .select("id, team_id")
      .eq("id", seed.apiKeyAId)
      .single();
    expect(ownerKeyErr).toBeNull();
    expect(ownerKey?.team_id).toBe(seed.teamAId);

    // Member (Team B) cannot see Team A API key
    const { data: memberKey, error: memberKeyErr } = await memberClient
      .from("bot_api_keys")
      .select("id")
      .eq("id", seed.apiKeyAId)
      .maybeSingle();
    expect(memberKeyErr).toBeNull();
    expect(memberKey).toBeNull();
  });

  it("denies non-admin access to admin cost tracking", async () => {
    if (!seed) {
      return;
    }
    const ownerClient = await createAuthedClient(seed.users.owner.email);
    const { data, error } = await ownerClient
      .from("admin_cost_tracking")
      .select("id")
      .limit(1)
      .maybeSingle();

    // Expect either null data or an RLS error; we only assert that non-admins don't see rows
    if (error) {
      expect((error as { code?: string }).code).toBeDefined();
    } else {
      expect(data).toBeNull();
    }
  });
});
