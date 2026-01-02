import type { SupabaseClient } from "@supabase/supabase-js";

type GetUserResult = {
  user: Awaited<ReturnType<SupabaseClient["auth"]["getUser"]>>["data"]["user"];
  error: Awaited<ReturnType<SupabaseClient["auth"]["getUser"]>>["error"] | null;
};

export async function getRequestUser(
  req: Request,
  supabase: SupabaseClient
): Promise<GetUserResult> {
  const { data, error } = await supabase.auth.getUser();
  if (data.user) {
    return { user: data.user, error: null };
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!token) {
    return { user: null, error };
  }

  const { data: tokenData, error: tokenError } =
    await supabase.auth.getUser(token);
  return { user: tokenData.user, error: tokenError ?? error };
}
