//src/utils/supabase/role.ts
// Server-only version
// export async function getUserRoleServer(): Promise<
//   "admin" | "user" | "moderator" | null
// > {
//   const supabase = await import("./server").then((m) => m.createClient());
//   const { data: user } = await supabase.auth.getUser();
//   if (!user?.user?.id) return null;

//   const { data, error } = await supabase
//     .from("bot_user_profiles")
//     .select("role")
//     .eq("id", user.user.id)
//     .single();

//   if (error) {
//     console.error("Error fetching role (server):", error.message);
//     return null;
//   }

//   return data?.role ?? null;
// }

// Client-safe version
export async function getUserRoleClient(): Promise<
  "admin" | "user" | "moderator" | null
> {
  const supabase = import("./client").then((m) => m.createClient());
  const { data: user } = await (await supabase).auth.getUser();
  if (!user?.user?.id) return null;

  const { data, error } = await (await supabase)
    .from("bot_user_profiles")
    .select("role")
    .eq("id", user.user.id)
    .single();

  if (error) {
    console.error("Error fetching role (client):", error.message);
    return null;
  }

  return data?.role ?? null;
}
