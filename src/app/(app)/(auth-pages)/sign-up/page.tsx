import { signUpAction } from "@/app/actions/auth/auth-actions";
import { FormMessage, type Message } from "@/components/message/form-message";
import { SubmitButton } from "@/components/control/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { UserPlus, CheckCircle2, Mail } from "lucide-react";
import { SmtpMessage } from "../smtp-message";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/conversations");
  }

  const params = await props.searchParams;

  // Show prominent success state instead of just the small message
  if ("success" in params) {
    return (
      <main className="flex-grow bg-background text-foreground flex items-center justify-center px-4 py-8 md:py-12">
        <Card className="w-full max-w-md border border-border bg-muted shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-500" />
              Almost there!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-6">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-3 flex-1">
                    <h3 className="font-semibold text-lg text-emerald-900 dark:text-emerald-100">
                      Check your email!
                    </h3>
                    <p className="text-sm text-emerald-800 dark:text-emerald-200">
                      We&apos;ve sent you a verification link. Click the link in
                      your email to activate your account and start building.
                    </p>
                    <div className="rounded-md bg-emerald-100 dark:bg-emerald-900/30 p-3 mt-4">
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                        <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>Didn&apos;t receive the email?</strong> Check
                          your spam folder. It may take a few minutes to arrive.
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center pt-4">
                <p className="text-sm text-muted-foreground">
                  Already verified?{" "}
                  <Link
                    className="text-foreground font-medium underline"
                    href="/sign-in"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <SmtpMessage />
      </main>
    );
  }

  return (
    <main className="flex-grow bg-background text-foreground flex flex-col gap-12 items-center justify-center px-4 py-8 md:py-12">
      <Card className="w-full max-w-md border border-border bg-muted shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-500" />
            Create Your Account
          </CardTitle>
          <CardDescription>
            Sign up to start building with ChatIQ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" action={signUpAction}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder="Your password"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>

            <SubmitButton
              formAction={signUpAction}
              pendingText="Signing up..."
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Sign Up
            </SubmitButton>

            {"error" in params && <FormMessage message={params} />}

            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link
                className="text-foreground font-medium underline"
                href="/sign-in"
              >
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
      <SmtpMessage />
    </main>
  );
}
