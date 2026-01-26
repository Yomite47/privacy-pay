import { InboxKeySection } from "@/components/InboxKeySection";

export default function SettingsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 pb-24 md:pb-8 bg-black text-white">
      <div className="w-full max-w-xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Settings
          </h1>
          <p className="mt-2 text-slate-400 leading-relaxed">
            Manage your local encryption keys. <br/>
            <span className="text-sm text-red-400/80">Warning: Losing these keys means you cannot decrypt past memos.</span>
          </p>
        </div>
        
        <InboxKeySection />
      </div>
    </main>
  );
}

