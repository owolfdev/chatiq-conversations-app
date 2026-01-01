import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { unsubscribeMarketingEmail } from "@/lib/email/unsubscribe";

interface UnsubscribePageProps {
  searchParams?: {
    email?: string;
    token?: string;
    status?: string;
    message?: string;
  };
}

function getMessage(searchParams?: UnsubscribePageProps["searchParams"]) {
  if (searchParams?.status === "success") {
    return {
      tone: "success",
      text: searchParams.message || "You have been unsubscribed from marketing emails.",
    };
  }

  if (searchParams?.status === "error") {
    return {
      tone: "error",
      text: searchParams.message || "We couldn't update your preferences.",
    };
  }

  return null;
}

async function unsubscribeAction(formData: FormData) {
  "use server";

  const email = formData.get("email")?.toString() || "";
  const token = formData.get("token")?.toString() || "";

  const result = await unsubscribeMarketingEmail({ email, token });
  const status = result.success ? "success" : "error";
  const message = result.success
    ? "You have been unsubscribed from marketing emails."
    : result.error || "We couldn't update your preferences.";

  redirect(
    `/unsubscribe?status=${status}&message=${encodeURIComponent(message)}`
  );
}

export default function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const email = searchParams?.email || "";
  const token = searchParams?.token || "";
  const message = getMessage(searchParams);
  const canSubmit = Boolean(email && token && searchParams?.status !== "success");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-6 py-20">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Unsubscribe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {message ? (
            <p
              className={
                message.tone === "success"
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {message.text}
            </p>
          ) : (
            <p className="text-sm text-zinc-600">
              Confirm below to stop receiving marketing emails from ChatIQ.
            </p>
          )}

          {!email || !token ? (
            <p className="text-sm text-red-600">
              This unsubscribe link is missing required information.
            </p>
          ) : null}

          {canSubmit ? (
            <form action={unsubscribeAction}>
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="token" value={token} />
              <Button type="submit">Confirm unsubscribe</Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
