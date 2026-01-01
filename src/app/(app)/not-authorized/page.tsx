"use client";

export default function DevelopmentModePage() {
  return (
    <main className="flex-grow bg-background text-foreground flex flex-col gap-12 items-center justify-center px-4">
      <div className="w-full max-w-md ">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Not Authorized</h1>
          <p className="text-sm text-muted-foreground">
            In development mode, only the developer can access this page.
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            If you are the developer, please sign in with your email. Note that
            this site is protected using middleware utility at:
            src/utils/supabase/middleware.ts. The unprotected version is
            available in commented code. If you are not the developer, please
            contact the developer to get access.
          </p>
        </div>
      </div>
    </main>
  );
}
