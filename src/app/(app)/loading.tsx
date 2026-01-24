import Image from "next/image";

export default function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-emerald-100">
          <Image
            src="/images/avatars/ios-icon.png"
            alt="ChatIQ Inbox"
            width={72}
            height={72}
            priority
          />
        </div>
        <div className="text-sm font-medium text-emerald-700 animate-pulse">
          Loading ChatIQ Inbox...
        </div>
      </div>
    </div>
  );
}
