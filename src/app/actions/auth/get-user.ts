"use server";
// src/app/actions/get-user.ts
import { createClient } from "@/utils/supabase/server";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
