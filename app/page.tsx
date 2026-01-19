import { WalletStatus } from "@/components/WalletStatus";
import { InboxKeySection } from "@/components/InboxKeySection";
import { PaymentLinkCreator } from "@/components/PaymentLinkCreator";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black text-white">
      <div className="w-full max-w-2xl space-y-12 text-center">
        <div className="space-y-4">
          <div className="inline-block px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-emerald-400">
            Live on Solana Devnet
          </div>
          
          <h1 className="text-5xl font-bold tracking-tight text-white">
            Cipher Pay
          </h1>
          
          <div className="space-y-2 text-lg text-slate-400 max-w-lg mx-auto">
            <p>Simple link-based payments with encrypted memos.</p>
          </div>
        </div>
        
        <div className="flex justify-center">
          <WalletStatus />
        </div>
      </div>
      
      <div className="mt-12 w-full max-w-xl space-y-8">
        <InboxKeySection />
        <PaymentLinkCreator />
      </div>
    </main>
  );
}
