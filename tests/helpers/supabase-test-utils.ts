// Test utilities for Supabase-backed integration/RLS tests
// Loads .env.test and provides seed/reset helpers against the test project

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import * as dotenv from "dotenv";
import { expect } from "vitest";

dotenv.config({ path: ".env.test" });

// Use non-null assertions for typing, keep runtime guard below for safety
const url = process.env.SUPABASE_URL_TEST!;
const anonKey = process.env.SUPABASE_ANON_KEY_TEST!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY_TEST!;
const TEST_PASSWORD = "TestPassword123!";

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL_TEST / SUPABASE_ANON_KEY_TEST / SUPABASE_SERVICE_ROLE_KEY_TEST in .env.test"
  );
}

// Clients: anon (for RLS assertions) and service (for seeding/reset)
export const supabaseAnon = createClient(url, anonKey);
export const supabaseService = createClient(url, serviceRoleKey);

export type SeedUsers = {
  owner: { id: string; email: string };
  member: { id: string; email: string };
};

export type SeedContext = {
  teamAId: string;
  teamBId: string;
  botAId: string;
  botBId: string;
  docAId: string;
  docBId: string;
  apiKeyAId: string;
  apiKeyA: string;
  users: SeedUsers;
};

/**
 * Create auth user + profile
 */
async function createUserWithProfile(
  client: SupabaseClient,
  email: string,
  plan: string = "free",
  role: "user" | "admin" = "user"
) {
  const {
    data: { user },
    error,
  } = await client.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (error || !user) {
    throw new Error(`Failed to create test user ${email}: ${error?.message}`);
  }

  const { error: profileError } = await client.from("bot_user_profiles").upsert({
    id: user.id,
    email,
    plan,
    role,
    created_at: new Date().toISOString(),
  });

  if (profileError) {
    throw new Error(
      `Failed to create profile for ${email}: ${profileError.message}`
    );
  }

  return user.id;
}

/**
 * Seed minimal multi-tenant fixtures for RLS tests:
 * - Team A owned by owner, Team B owned by member
 * - Member also joins Team A as member
 * - One bot and doc per team
 */
export async function seedBasicFixtures(): Promise<SeedContext> {
  const ownerEmail = `owner+${randomUUID()}@example.com`;
  const memberEmail = `member+${randomUUID()}@example.com`;

  const ownerId = await createUserWithProfile(
    supabaseService,
    ownerEmail,
    "free",
    "user"
  );
  const memberId = await createUserWithProfile(
    supabaseService,
    memberEmail,
    "free",
    "user"
  );

  // Teams
  const teamAId = randomUUID();
  const teamBId = randomUUID();

  const { error: teamAError } = await supabaseService.from("bot_teams").insert({
    id: teamAId,
    owner_id: ownerId,
    name: "Team A",
    plan: "free",
    created_at: new Date().toISOString(),
  });
  if (teamAError) {
    throw new Error(`Failed to create Team A: ${teamAError.message}`);
  }

  const { error: teamBError } = await supabaseService.from("bot_teams").insert({
    id: teamBId,
    owner_id: memberId,
    name: "Team B",
    plan: "free",
    created_at: new Date().toISOString(),
  });
  if (teamBError) {
    throw new Error(`Failed to create Team B: ${teamBError.message}`);
  }

  // Memberships
  const { error: ownerMembershipError } = await supabaseService
    .from("bot_team_members")
    .insert({
      id: randomUUID(),
      team_id: teamAId,
      user_id: ownerId,
      role: "owner",
      created_at: new Date().toISOString(),
    });
  if (ownerMembershipError) {
    throw new Error(
      `Failed to add owner to Team A: ${ownerMembershipError.message}`
    );
  }

  const { error: memberOwnerMembershipError } = await supabaseService
    .from("bot_team_members")
    .insert({
      id: randomUUID(),
      team_id: teamBId,
      user_id: memberId,
      role: "owner",
      created_at: new Date().toISOString(),
    });
  if (memberOwnerMembershipError) {
    throw new Error(
      `Failed to add member as owner to Team B: ${memberOwnerMembershipError.message}`
    );
  }

  // Bots
  const botAId = randomUUID();
  const botBId = randomUUID();

  const botInsert = await supabaseService.from("bot_bots").insert([
    {
      id: botAId,
      team_id: teamAId,
      user_id: ownerId,
      name: "Bot A",
      system_prompt: "You are Bot A",
      slug: `bot-a-${botAId.slice(0, 8)}`,
      status: "active",
      is_public: false,
      created_at: new Date().toISOString(),
    },
    {
      id: botBId,
      team_id: teamBId,
      user_id: memberId,
      name: "Bot B",
      system_prompt: "You are Bot B",
      slug: `bot-b-${botBId.slice(0, 8)}`,
      status: "active",
      is_public: false,
      created_at: new Date().toISOString(),
    },
  ]);

  if (botInsert.error) {
    throw new Error(`Failed to create bots: ${botInsert.error.message}`);
  }

  // Documents
  const docAId = randomUUID();
  const docBId = randomUUID();

  const docInsert = await supabaseService.from("bot_documents").insert([
    {
      id: docAId,
      bot_id: botAId,
      team_id: teamAId,
      title: "Doc A",
      content: "Doc A content",
      tags: ["a"],
      created_at: new Date().toISOString(),
      version: 1,
      is_flagged: false,
    },
    {
      id: docBId,
      bot_id: botBId,
      team_id: teamBId,
      title: "Doc B",
      content: "Doc B content",
      tags: ["b"],
      created_at: new Date().toISOString(),
      version: 1,
      is_flagged: false,
    },
  ]);

  if (docInsert.error) {
    throw new Error(`Failed to create docs: ${docInsert.error.message}`);
  }

  // API key for Team A (to test scope)
  const apiKeyAId = randomUUID();
  const apiKeyA = `test_key_${randomUUID()}`;
  const { error: apiKeyError } = await supabaseService.from("bot_api_keys").insert({
    id: apiKeyAId,
    team_id: teamAId,
    bot_id: botAId,
    user_id: ownerId,
    key: apiKeyA,
    active: true,
    created_at: new Date().toISOString(),
  });
  if (apiKeyError) {
    throw new Error(`Failed to create API key for Team A: ${apiKeyError.message}`);
  }

  return {
    teamAId,
    teamBId,
    botAId,
    botBId,
    docAId,
    docBId,
    apiKeyAId,
    apiKeyA,
    users: {
      owner: { id: ownerId, email: ownerEmail },
      member: { id: memberId, email: memberEmail },
    },
  };
}

/**
 * Create a fresh authed client for a specific user (email/password)
 */
export async function createAuthedClient(email: string) {
  const client = createClient(url, anonKey);
  const { error } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) {
    throw new Error(`Failed to sign in test user ${email}: ${error.message}`);
  }
  return client;
}

/**
 * Best-effort reset of seeded data.
 * Deletes by IDs we created and removes auth users.
 */
export async function resetSeed(ctx: SeedContext) {
  // Delete in dependency-safe order (children first)
  await supabaseService
    .from("bot_document_links")
    .delete()
    .in("document_id", [ctx.docAId, ctx.docBId]);
  await supabaseService.from("bot_documents").delete().in("id", [
    ctx.docAId,
    ctx.docBId,
  ]);
  await supabaseService
    .from("bot_bots")
    .delete()
    .in("id", [ctx.botAId, ctx.botBId]);
  await supabaseService
    .from("bot_api_keys")
    .delete()
    .eq("id", ctx.apiKeyAId);
  await supabaseService
    .from("bot_team_members")
    .delete()
    .in("team_id", [ctx.teamAId, ctx.teamBId]);
  await supabaseService
    .from("bot_teams")
    .delete()
    .in("id", [ctx.teamAId, ctx.teamBId]);
  await supabaseService
    .from("bot_user_profiles")
    .delete()
    .in("id", [ctx.users.owner.id, ctx.users.member.id]);

  // Delete auth users via admin API
  await supabaseService.auth.admin.deleteUser(ctx.users.owner.id);
  await supabaseService.auth.admin.deleteUser(ctx.users.member.id);
}

/**
 * Utility to assert a query fails due to RLS (or returns empty)
 */
export async function expectNoAccess<T>(
  promise: Promise<{ data: T | null; error: unknown }>
) {
  const { data, error } = await promise;
  if (error) {
    expect((error as { code?: string }).code).toBeDefined();
    return;
  }
  expect(data).toBeNull();
}
