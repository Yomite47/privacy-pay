import { WalletStatus } from "@/components/WalletStatus";
import { InboxKeySection } from "@/components/InboxKeySection";
import { PaymentLinkCreator } from "@/components/PaymentLinkCreator";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 text-slate-50">
      <div className="w-full max-w-xl space-y-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Create a payment link
        </h1>
        <div className="space-y-1 text-sm text-slate-300">
          <p>Optional private memo (encrypted, only receiver can read).</p>
          <p>Share the link with someone to pay you on devnet.</p>
        </div>
        <div className="mt-6">
          <WalletStatus />
        </div>
      </div>
      <InboxKeySection />
      <PaymentLinkCreator />
    </main>
  );
}
