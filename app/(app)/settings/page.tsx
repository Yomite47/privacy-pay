import { InboxKeySection } from "@/components/InboxKeySection";
import { ViewingKeyPanel } from "@/components/ViewingKeyPanel";

export default function SettingsPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Header bar — matches dashboard */}
      <div className="flex items-center justify-between px-6 h-[65px] border-b border-black/[0.06] dark:border-white/[0.06] bg-[#f8f8f8] dark:bg-black shrink-0">
        <h1 className="text-lg font-bold text-black dark:text-white">Settings</h1>
        <span className="text-xs text-black/40 dark:text-white/30">Losing keys = losing access to past memos</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6 bg-[#f8f8f8] dark:bg-black">
        <div className="max-w-xl space-y-8">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">Encryption Keys</h2>
            <p className="text-sm text-black/50 dark:text-white/40">
              Keys are derived from your wallet signature and never leave your device.
            </p>
            <InboxKeySection />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-black/60 dark:text-white/60 uppercase tracking-wider">Viewing Key</h2>
            <p className="text-sm text-black/50 dark:text-white/40">
              Share with auditors so they can read your transaction history without being able to spend funds.
            </p>
            <ViewingKeyPanel />
          </div>
        </div>
      </div>

    </div>
  );
}

