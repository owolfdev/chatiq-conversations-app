// src/components/nav/components/user-menu.tsx
"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/utils/supabase/client";

interface UserMenuProps {
  name?: string;
}

export default function UserMenu({ name }: UserMenuProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchUnreadCount = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("bot_user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      const { count } = await supabase
        .from("bot_contact_messages")
        .select("*", { count: "exact", head: true })
        .eq("status", "unread");

      if (typeof count === "number") setUnreadCount(count);
    }
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get role and avatar
      const { data: profile } = await supabase
        .from("bot_user_profiles")
        .select("avatar_url, role")
        .eq("id", user.id)
        .single();

      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
      if (profile?.role === "admin") {
        setIsAdmin(true);
        await fetchUnreadCount();
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    // Listen for message status updates (only if admin)
    if (!isAdmin) return;

    const handleMessageStatusUpdate = () => {
      fetchUnreadCount();
    };

    window.addEventListener("messageStatusUpdated", handleMessageStatusUpdate);

    return () => {
      window.removeEventListener(
        "messageStatusUpdated",
        handleMessageStatusUpdate
      );
    };
  }, [isAdmin]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setDialogOpen(false);
    setTimeout(() => {
      window.location.href = "/sign-in?redirect=/conversations";
    }, 50);
  };

  const toAppHref = (path: string) => path;

  if (!name) {
    return (
      <>
        <Button variant="ghost" asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button className="bg-emerald-500 hover:bg-emerald-600" asChild>
          <Link href="/sign-up">Sign up</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <div className="relative">
            {isAdmin && unreadCount > 0 && (
              <div className="absolute -top-1 -left-1 z-20 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full shadow-lg">
                {unreadCount > 9 ? "9+" : unreadCount}
              </div>
            )}
            <Avatar className="cursor-pointer bg-emerald-600 text-white">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={name} />
              ) : (
                <>
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <AvatarImage src="" alt={name} className="opacity-0" />
                  <AvatarFallback className="opacity-0">
                    {name[0]?.toUpperCase()}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled className="text-md">
            {name}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={toAppHref("/profile")}>Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={toAppHref("/conversations")}>Conversations</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/contact">Support</Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setMenuOpen(false);
              setTimeout(() => setDialogOpen(true), 10);
            }}
          >
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end your session. You can always sign back in later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
