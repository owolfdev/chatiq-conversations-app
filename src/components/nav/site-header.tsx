import MainNav from "./components/main-nav";
import { getUser } from "@/app/actions/auth/get-user";

export default async function SiteHeader() {
  const user = await getUser();
  const name = user?.user_metadata?.full_name || user?.email || undefined;

  return (
    <MainNav user={user ? { name } : null} />
  );
}
