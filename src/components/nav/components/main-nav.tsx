// src/components/nav/components/main-nav.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserMenu as ConversationsUserMenu } from "@/components/conversations/user-menu";

interface MainNavProps {
  user?: { name?: string } | null;
}

export default function MainNav({ user }: MainNavProps) {
  const pathname = usePathname();
  const isConversationDetail =
    pathname?.startsWith("/conversations/") && pathname !== "/conversations";
  const homeHref =
    pathname === "/conversations"
      ? "/"
      : pathname?.startsWith("/conversations/")
      ? "/conversations"
      : "/conversations";

  return (
    <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <nav className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={homeHref} className="flex items-center gap-2">
              <Image
                src="/icon-192.png"
                alt="ChatIQ Inbox"
                width={24}
                height={24}
                className="h-6 w-6 rounded"
                priority
              />
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
              <span className="sr-only">Conversations</span>
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
