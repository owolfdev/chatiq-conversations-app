// src/app/beta-access/page.tsx
// Beta access required page

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Mail, ArrowRight } from "lucide-react";

export default function BetaAccessPage() {
  return (
    <main className="flex-grow bg-background text-foreground flex items-center justify-center min-h-[calc(100vh-200px)] px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Beta Access Required</CardTitle>
          <CardDescription className="text-base">
            ChatIQ is currently in beta. Please sign in to access the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              We're currently in beta and limiting access to developers and early testers.
            </p>
            <p>
              If you have an account, sign in below. If you need access, please contact us.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/sign-in">
                <Mail className="mr-2 h-4 w-4" />
                Sign In
              </Link>
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="https://www.chatiq.io/contact">
                Request Access
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="text-primary hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
