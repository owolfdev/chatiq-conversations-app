"use client";

import {
  signInAction,
  signInWithMagicLinkAction,
} from "@/app/actions/auth/auth-actions";
import { FormMessage, type Message } from "@/components/message/form-message";
import { SubmitButton } from "@/components/control/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { LogIn, Mail, Lock, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

export function SignInForm({
  initialMessage,
  emailFromParams,
}: {
  initialMessage?: Message;
  emailFromParams?: string;
}) {
  const [activeTab, setActiveTab] = useState<"password" | "magic-link">(
    "password"
  );
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState(emailFromParams || "");

  // Check if we just successfully sent a magic link
  useEffect(() => {
    if ("success" in (initialMessage || {})) {
      // Switch to magic-link tab and show success state
      setActiveTab("magic-link");
      setMagicLinkSent(true);
    }
  }, [initialMessage]);

  // Reset magic link sent state when switching tabs or after form submission
  useEffect(() => {
    if (activeTab !== "magic-link") {
      setMagicLinkSent(false);
      setMagicLinkEmail("");
    }
  }, [activeTab]);

  // Set email from props if available
  useEffect(() => {
    if (emailFromParams) {
      setMagicLinkEmail(emailFromParams);
    }
  }, [emailFromParams]);

  // Show prominent success state for magic link (replace entire form)
  if (
    magicLinkSent ||
    ("success" in (initialMessage || {}) && activeTab === "magic-link")
  ) {
    return (
      <div className="space-y-6 w-full">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-3 flex-1">
              <h3 className="font-semibold text-lg text-emerald-900 dark:text-emerald-100">
                Check your email!
              </h3>
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                {magicLinkEmail ? (
                  <>
                    We&apos;ve sent a magic link to{" "}
                    <strong className="font-semibold">{magicLinkEmail}</strong>.
                    Click the link in the email to sign in instantly - no
                    password needed!
                  </>
                ) : (
                  <>
                    We&apos;ve sent a magic link to your email. Click the link
                    in the email to sign in instantly - no password needed!
                  </>
                )}
              </p>
              <div className="rounded-md bg-emerald-100 dark:bg-emerald-900/30 p-3 mt-4">
                <p className="text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Didn&apos;t receive the email?</strong> Check your
                    spam folder or{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMagicLinkSent(false);
                        setMagicLinkEmail("");
                      }}
                      className="underline font-medium hover:text-emerald-900 dark:hover:text-emerald-200"
                    >
                      try again
                    </button>
                    . It may take a few minutes to arrive.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Password
          </TabsTrigger>
          <TabsTrigger value="magic-link" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Magic Link
          </TabsTrigger>
        </TabsList>

        {/* Password Sign-In */}
        <TabsContent value="password" className="space-y-6 mt-6">
          <form className="space-y-6" action={signInAction}>
            <div className="space-y-2">
              <Label htmlFor="email-password">Email</Label>
              <Input
                id="email-password"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  className="text-xs text-foreground underline"
                  href="/forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder="Your password"
                required
              />
            </div>

            <SubmitButton
              pendingText="Signing In..."
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In with Password
            </SubmitButton>
          </form>
        </TabsContent>

        {/* Magic Link Sign-In */}
        <TabsContent value="magic-link" className="space-y-6 mt-6">
          <form className="space-y-6" action={signInWithMagicLinkAction}>
            <div className="space-y-2">
              <Label htmlFor="email-magic">Email</Label>
              <Input
                id="email-magic"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground border border-border">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    No password required
                  </p>
                  <p>
                    We&apos;ll send you a secure magic link to sign in. Just
                    click the link in your email - it&apos;s that simple!
                  </p>
                </div>
              </div>
            </div>

            <SubmitButton
              pendingText="Sending Magic Link..."
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Magic Link
            </SubmitButton>
          </form>
        </TabsContent>
      </Tabs>

      {initialMessage && !("success" in initialMessage) && (
        <FormMessage message={initialMessage} />
      )}

      <p className="text-sm text-center text-muted-foreground mt-6">
        Don&apos;t have an account?{" "}
        <Link className="text-foreground font-medium underline" href="/sign-up">
          Sign up
        </Link>
      </p>
    </>
  );
}
