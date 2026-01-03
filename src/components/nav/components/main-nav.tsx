// src/components/nav/components/main-nav.tsx
"use client";

import Link from "next/link";
import { Bot, Home, MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserMenu as ConversationsUserMenu } from "@/components/conversations/user-menu";

interface MainNavProps {
  user?: { name?: string } | null;
}

export default function MainNav({ user }: MainNavProps) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/conversations", label: "Conversations", icon: MessageSquare },
  ];

  return (
    <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <nav className="grid h-16 items-center gap-2 grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center justify-start">
            <Link href="/" className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-emerald-500" />
              <span className="font-bold text-xl">Inbox</span>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-5">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname?.startsWith(`${href}/`);
              return (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-emerald-600"
                      : "text-muted-foreground hover:text-emerald-500"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="sr-only">{label}</span>
                </Link>
              );
            })}
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
