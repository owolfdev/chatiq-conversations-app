// src/lib/utils/get-display-name.ts
import { getUserWithProfile } from "@/app/actions/auth/get-user-with-profile";

export async function getDisplayName(): Promise<string> {
  const user = await getUserWithProfile();
  return user?.full_name?.trim() || user?.username || user?.email || "there";
}
