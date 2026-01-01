"use client";

import { UserMenu } from "@/components/conversations/user-menu";

interface ConversationsTopBarProps {
  showUserMenu?: boolean;
}

export function ConversationsTopBar({
  showUserMenu = true,
}: ConversationsTopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
        <div className="text-sm font-semibold tracking-tight">
          Conversations
        </div>
        {showUserMenu ? <UserMenu /> : null}
      </div>
    </header>
  );
}
