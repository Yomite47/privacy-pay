import { InboxKeySection } from "@/components/InboxKeySection";

export default function SettingsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 text-slate-50">
      <div className="w-full max-w-xl space-y-4 text-left">
        <h1 className="text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-slate-300">
          Export keys (backup).
        </p>
        <p className="text-sm text-slate-300">
          Import keys (restore).
        </p>
        <p className="text-sm text-slate-300">
          Losing keys means losing ability to decrypt old memos.
        </p>
        <InboxKeySection />
      </div>
    </main>
  );
}

