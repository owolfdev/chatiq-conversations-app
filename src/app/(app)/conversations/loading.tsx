export default function ConversationsLoading() {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-4 pb-10 pt-4">
      <div className="mb-6 h-10 w-full rounded-md bg-muted animate-pulse" />
      <div className="space-y-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-border bg-card px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
