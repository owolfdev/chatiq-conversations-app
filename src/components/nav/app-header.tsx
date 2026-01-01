//src/components/nav/app-header.tsx
import { getUser } from "@/app/actions/auth/get-user";
import MainNav from "./components/main-nav";
import { logout } from "@/app/actions/auth/logout";
import { headers } from "next/headers";

export default async function AppHeader() {
  const user = await getUser();
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const isAppHost = host.startsWith("app.");

  const name = user?.user_metadata?.full_name || user?.email || undefined;

  return (
    <MainNav user={user ? { name } : null} logout={logout} isAppHost={isAppHost} />
  );
}
