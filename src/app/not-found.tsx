// src/app/not-found.tsx
import Link from "next/link";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 pt-0 pb-24">
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Bot className="h-8 w-8 text-emerald-500" />
          <span className="font-bold text-2xl">ChatIQ</span>
        </div>

        {/* 404 Heading */}
        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">
            Page Not Found
          </h2>
        </div>

        {/* Description */}
        <p className="text-muted-foreground max-w-md text-lg">
          Sorry, we couldn&apos;t find that page. The page you&apos;re looking
          for might have been moved, deleted, or doesn&apos;t exist.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button
            asChild
            variant="default"
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            <Link href="/">Go to Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
