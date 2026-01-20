"use client";

import { useState } from "react";
import { WalletStatus } from "@/components/WalletStatus";
import { InboxKeySection } from "@/components/InboxKeySection";
import { PaymentLinkCreator } from "@/components/PaymentLinkCreator";
import { ShieldedBalance } from "@/components/ShieldedBalance";
import { Shield, Key, Link as LinkIcon } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'shield' | 'keys' | 'link'>('shield');

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
        {/* Tab Navigation */}
        <div className="flex p-1 space-x-1 bg-slate-900/50 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('shield')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'shield'
                ? 'bg-solana-green text-black shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-4 h-4" />
            Shielded Wallet
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'link'
                ? 'bg-solana-green text-black shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            Receive
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === 'keys'
                ? 'bg-solana-green text-black shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Key className="w-4 h-4" />
            Keys
          </button>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {activeTab === 'shield' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ShieldedBalance />
            </div>
          )}
          {activeTab === 'link' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PaymentLinkCreator />
            </div>
          )}
          {activeTab === 'keys' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <InboxKeySection />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
