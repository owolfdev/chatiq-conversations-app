import { forgotPasswordAction } from "@/app/actions/auth/auth-actions";
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
import { KeyRound } from "lucide-react";
import { SmtpMessage } from "../smtp-message";

export default async function ForgotPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;

  return (
    <main className="flex-grow bg-background text-foreground flex flex-col gap-12 items-center justify-center px-4 py-8 md:py-12">
      <Card className="w-full max-w-md border border-border bg-muted shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-emerald-500" />
            Reset Your Password
          </CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" action={forgotPasswordAction}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <SubmitButton
              formAction={forgotPasswordAction}
              pendingText="Sending Reset Link..."
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Reset Password
            </SubmitButton>

            <FormMessage message={searchParams} />

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
