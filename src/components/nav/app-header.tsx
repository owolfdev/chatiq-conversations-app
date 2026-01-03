//src/components/nav/app-header.tsx
import { getUser } from "@/app/actions/auth/get-user";
import MainNav from "./components/main-nav";

export default async function AppHeader() {
  const user = await getUser();
  const name = user?.user_metadata?.full_name || user?.email || undefined;

  return (
    <MainNav user={user ? { name } : null} />
  );
}
