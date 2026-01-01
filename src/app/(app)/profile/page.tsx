// src/app/profile/page.tsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  LinkIcon,
  Calendar,
  Github,
  Twitter,
  MessageSquare,
  Settings,
} from "lucide-react";

import { getUserWithProfile } from "@/app/actions/auth/get-user-with-profile";
import { getUserBotsWithCounts } from "@/app/actions/bots/get-user-bots-with-counts";
import { Profile } from "@/types/profile";
import Link from "next/link";
import PaginatedActivityFeed from "@/components/profile/PaginatedActivityFeed";
import { getUserActivityLogs } from "@/app/actions/activity/get-user-activity-logs";

export default async function ProfilePage() {
  const user = await getUserWithProfile();
  const botContext = await getUserBotsWithCounts();
  const bots = [...botContext.team.bots, ...botContext.personal.bots];
  const activityLogs = await getUserActivityLogs(user?.id ?? "");

  if (!user) return <div className="text-center">You must be signed in.</div>;
  const planLabel = user.plan === "free" ? "Evaluation" : user.plan ?? "Evaluation";

  const profile: Profile = {
    name: user.full_name ?? "No name",
    username: user.username ?? "No username",
    bio: user.bio ?? "No bio",
    avatar: user.avatar_url ?? "/placeholder.svg?height=200&width=200",
    location: user.location ?? "Unknown location",
    website: user.website ?? "https://example.com",
    email: user.email ?? "unknown@example.com",
    joinDate: user.created_at
      ? new Date(user.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        })
      : "Unknown",
    plan: planLabel,
    social: {
      twitter: user?.twitter_handle ?? "",
      github: user?.github_handle ?? "",
    },
    stats: {
      chatbots: bots.length,
      messages: bots.reduce((acc, bot) => acc + bot.messages, 0),
      followers: 0,
      following: 0,
    },
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 xl:col-span-3">
            <Card className="sticky top-8">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-emerald-100 dark:ring-emerald-900">
                    <AvatarImage
                      src={profile.avatar || "/placeholder.svg"}
                      alt={profile.name}
                    />
                    <AvatarFallback className="text-2xl">
                      {profile.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  <h1 className="text-2xl font-bold mb-1">{profile.name}</h1>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                    @{profile.username}
                  </p>

                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Badge
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                    >
                      {profile.plan} Plan
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-6 text-center">
                  {profile.bio}
                </p>

                <div className="mb-6">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/dashboard/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </Link>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                    <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                      {profile.stats.chatbots}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      Chatbots
                    </div>
                  </div>
                  <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                    <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                      {profile.stats.messages.toLocaleString()}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      Messages
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {profile.location && (
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <LinkIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        {profile.website.replace(/(^\w+:|^)\/\//, "")}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {profile.joinDate}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 mb-6">
                  {profile.social.twitter && (
                    <Button variant="outline" size="icon" asChild>
                      <a
                        href={`https://twitter.com/${profile.social.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Twitter className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {profile.social.github && (
                    <Button variant="outline" size="icon" asChild>
                      <a
                        href={`https://github.com/${profile.social.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Github className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 xl:col-span-9">
            <Tabs defaultValue="chatbots" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chatbots">Chatbots</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="chatbots" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">My Chatbots</h2>
                </div>

                {/* Chatbots */}
                <div className="grid gap-4">
                  {bots.map((bot) => (
                    <Card key={bot.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{bot.name}</CardTitle>
                          <Badge
                            variant={"default"}
                            className={
                              "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            }
                          >
                            Active
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                          {bot.description ?? "No description provided."}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              {bot.messages} messages
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/dashboard/bots/${bot.slug}/settings`}>
                                Settings
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/chat/${bot.slug}`}>View</Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Activity */}
              <TabsContent value="activity" className="space-y-4">
                <h2 className="text-2xl font-bold">Recent Activity</h2>
                <PaginatedActivityFeed
                  userId={user.id}
                  initialLogs={activityLogs}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
