// src/components/nav/components/main-nav.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserMenu as ConversationsUserMenu } from "@/components/conversations/user-menu";
import type { InboxCounts } from "@/types/inbox";
import { INBOX_COUNTS_EVENT } from "@/lib/inbox-counts";

interface MainNavProps {
  user?: { name?: string } | null;
}

export default function MainNav({ user }: MainNavProps) {
  const pathname = usePathname();
  const isConversationDetail =
    pathname?.startsWith("/conversations/") && pathname !== "/conversations";
  const isBookingDetail =
    pathname?.startsWith("/bookings/") && pathname !== "/bookings";
  const homeHref =
    pathname === "/conversations"
      ? "/"
      : pathname?.startsWith("/conversations/")
      ? "/conversations"
      : pathname?.startsWith("/bookings/")
      ? "/bookings"
      : "/conversations";
  const [inboxCounts, setInboxCounts] = useState<InboxCounts | null>(null);

  useEffect(() => {
    const handleCountsUpdate = (event: Event) => {
      const detail = (event as CustomEvent<InboxCounts>).detail;
      if (detail) {
        setInboxCounts(detail);
      }
    };
    window.addEventListener(INBOX_COUNTS_EVENT, handleCountsUpdate);
    return () => {
      window.removeEventListener(INBOX_COUNTS_EVENT, handleCountsUpdate);
    };
  }, []);

  const openCount = inboxCounts?.openConversations ?? 0;
  const pendingCount = inboxCounts?.pendingBookings ?? 0;
  const upcomingCount = inboxCounts?.upcomingConfirmedBookings ?? 0;

  const logoCount = openCount + pendingCount;
  const logoBadge = useMemo(() => {
    if (!inboxCounts || logoCount <= 0) return null;
    return logoCount > 99 ? "99+" : String(logoCount);
  }, [inboxCounts, logoCount]);

  const conversationsDotClass =
    openCount > 0 ? "bg-amber-400" : "bg-muted-foreground/40";
  const bookingsDotClass =
    pendingCount > 0
      ? "bg-amber-400"
      : upcomingCount > 0
      ? "bg-emerald-400"
      : "bg-muted-foreground/40";

  return (
    <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <nav className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={homeHref} className="flex items-center gap-2">
              <span className="relative">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white">
                  <MessageSquare className="h-4 w-4" />
                </span>
                {logoBadge ? (
                  <span className="absolute -right-2 -top-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow">
                    {logoBadge}
                  </span>
                ) : null}
              </span>
              <span className="font-bold text-xl">Inbox</span>
            </Link>
            <Link
              href="/conversations"
              aria-label="Conversations"
              className={`flex items-center gap-2 text-sm font-medium transition-transform transition-colors active:scale-90 ${
                pathname === "/conversations" ||
                pathname?.startsWith("/conversations/")
                  ? "text-emerald-600"
                  : "text-muted-foreground hover:text-emerald-500"
              }`}
            >
              {isConversationDetail ? (
                <ArrowLeft className="h-4 w-4" />
              ) : null}
              <MessageSquare className="h-5 w-5" />
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${conversationsDotClass}`}
              />
              <span className="sr-only">Conversations</span>
            </Link>
            <Link
              href="/bookings"
              aria-label="Bookings"
              className={`flex items-center gap-2 text-sm font-medium transition-transform transition-colors active:scale-90 ${
                pathname === "/bookings" || pathname?.startsWith("/bookings/")
                  ? "text-emerald-600"
                  : "text-muted-foreground hover:text-emerald-500"
              }`}
            >
              {isBookingDetail ? <ArrowLeft className="h-4 w-4" /> : null}
              <CalendarDays className="h-5 w-5" />
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${bookingsDotClass}`}
              />
              <span className="sr-only">Bookings</span>
            </Link>
          </div>
          <div className="flex items-center justify-end gap-3">
            {user ? (
              <ConversationsUserMenu />
            ) : (
              <Button variant="ghost" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
