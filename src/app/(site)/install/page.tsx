import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const metadata: Metadata = {
  title: "Install",
};

export default function InstallPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
        <div>
          <h1 className="text-2xl font-semibold">Install the app</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            For the best experience, add this app to your home screen.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">iOS (Safari)</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Tap the Share button in Safari.</li>
            <li>Select “Add to Home Screen”.</li>
            <li>Confirm the name and tap Add.</li>
          </ol>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Android (Chrome)</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Open the menu (⋮) in Chrome.</li>
            <li>Tap “Install app” or “Add to Home screen”.</li>
            <li>Confirm to install.</li>
          </ol>
          <div className="mt-3">
            <Button size="sm" className="gap-2" disabled>
              <Download className="h-4 w-4" />
              Install
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              The install button appears automatically on supported devices.
            </p>
          </div>
        </div>

        <Button variant="outline" asChild>
          <Link href="/conversations">Back to conversations</Link>
        </Button>
      </section>
    </main>
  );
}
