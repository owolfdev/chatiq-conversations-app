import {
  signInAction,
  signInWithMagicLinkAction,
} from "@/app/actions/auth/auth-actions";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { LogIn, Mail, Lock } from "lucide-react";
import { SignInForm } from "./sign-in-form";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Login(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/conversations");
  }

  const searchParams = await props.searchParams;

  // Convert searchParams to Message format
  // Handle both Message format (success/error/message) and raw searchParams (for email)
  const message: Message | undefined =
    "success" in searchParams && typeof searchParams.success === "string"
      ? { success: searchParams.success }
      : "error" in searchParams && typeof searchParams.error === "string"
      ? { error: searchParams.error }
      : "message" in searchParams && typeof searchParams.message === "string"
      ? { message: searchParams.message }
      : undefined;

  return (
    <main className="flex-grow bg-background text-foreground flex items-center justify-center px-4 py-8 md:py-12">
      <Card className="w-full max-w-md border border-border bg-muted shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-emerald-500" />
            Sign in to Your Account
          </CardTitle>
          <CardDescription>
            Choose your preferred sign-in method below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm
            initialMessage={message}
            emailFromParams={
              typeof searchParams.email === "string"
                ? searchParams.email
                : undefined
            }
          />
        </CardContent>
      </Card>
    </main>
  );
}
