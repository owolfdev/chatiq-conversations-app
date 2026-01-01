// src/app/dashboard/bots/new/page.tsx
import NewBotForm from "./new-bot-form";

export default async function NewBotPage() {
  return (
    <main className="py-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-primary">Create</p>
          <h1 className="text-3xl font-bold leading-tight">Create a New Bot</h1>
          <p className="text-muted-foreground">
            Share a detailed description, optional tone, and an info-rich URL. We’ll generate the bot name, prompt, and tailored responses automatically.
          </p>
        </div>

        <div className="max-w-3xl">
          <NewBotForm />
        </div>
      </div>
    </main>
  );
}
