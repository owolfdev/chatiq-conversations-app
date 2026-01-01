// src/app/dashboard/admin/users/[userId]/page.tsx

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AdminUserDetailsPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function AdminUserDetailsPage({
  params,
}: AdminUserDetailsPageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: currentProfile } = await supabase
    .from("bot_user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!currentProfile || currentProfile.role !== "admin") {
    redirect("/not-authorized");
  }

  const admin = createAdminClient();
  const { data: overview, error: overviewError } = await admin
    .from("admin_user_overview")
    .select(
      "id, email, full_name, plan, role, created_at, team_id, team_name, bot_count, conversation_count, document_count, last_active_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (overviewError) {
    console.error("Failed to load admin user overview:", overviewError.message);
  }

  if (!overview) {
    notFound();
  }

  const { data: bots } = await admin
    .from("bot_bots")
    .select("id, name, slug, status, is_public, created_at")
    .eq("user_id", overview.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const lastActive = overview.last_active_at ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">User Profile</h1>
            <p className="text-muted-foreground mt-2">
              Analytics and bot activity for this account
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin/users">Back to users</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-4 py-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-lg font-semibold">
                {overview.full_name || overview.email}
              </div>
              <Badge variant="outline">{overview.plan}</Badge>
              {overview.role === "admin" ? (
                <Badge variant="secondary">Admin</Badge>
              ) : null}
            </div>
            <div className="text-sm text-muted-foreground">
              {overview.email}
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              {overview.id}
            </div>
            {overview.team_name ? (
              <div className="text-xs text-muted-foreground">
                Team: {overview.team_name}
              </div>
            ) : null}
            <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
              <span>
                Joined: {new Date(overview.created_at).toLocaleDateString()}
              </span>
              <span>
                Last activity:{" "}
                {lastActive
                  ? new Date(lastActive).toLocaleDateString()
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard title="Bots" value={overview.bot_count ?? 0} />
          <StatCard
            title="Conversations"
            value={overview.conversation_count ?? 0}
          />
          <StatCard title="Documents" value={overview.document_count ?? 0} />
        </div>

        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Bots</h2>
                <p className="text-sm text-muted-foreground">
                  Showing the 50 most recent bots
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bots && bots.length > 0 ? (
                    bots.map((bot) => (
                      <TableRow key={bot.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{bot.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {bot.slug ? `/${bot.slug}` : "No slug"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{bot.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {bot.is_public ? "Public" : "Private"}
                        </TableCell>
                        <TableCell>
                          {new Date(bot.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/admin/bots/${bot.id}`}>
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        No bots created yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
