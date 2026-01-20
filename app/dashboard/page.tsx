"use client";

import { useState } from "react";
import { InboxKeySection } from "@/components/InboxKeySection";
import { PaymentLinkCreator } from "@/components/PaymentLinkCreator";
import { ShieldedBalance } from "@/components/ShieldedBalance";
import { Shield, Key, Link as LinkIcon } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'shield' | 'keys' | 'link'>('shield');

  const descriptions = {
    shield: "Manage your private assets with Zero-Knowledge compression. Shield public SOL, send privately, or unshield back to your wallet.",
    link: "Generate secure payment links with end-to-end encrypted memos. Share links to receive funds privately.",
    keys: "Manage your inbox encryption keys. Your keys are derived from your wallet signature and never leave your device."
  };

  return (
    <main className="flex min-h-screen flex-col text-white relative overflow-hidden bg-slate-950 pt-24 md:pt-32">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[100px]" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-start p-4 md:p-8 w-full max-w-4xl mx-auto z-10">
        <div className="space-y-8 md:space-y-12 text-center w-full max-w-2xl">
          <div className="space-y-6 md:space-y-10">
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-medium text-emerald-400 shadow-xl shadow-purple-900/5">
              Live on Solana Devnet
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-slate-400 drop-shadow-sm">
              Cipher Pay
            </h1>
            
            <div className="space-y-4 text-base md:text-lg text-slate-400 max-w-lg mx-auto min-h-[3.5rem] transition-all duration-300">
              <p className="animate-in fade-in slide-in-from-bottom-2 duration-300 key={activeTab}">
                {descriptions[activeTab]}
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-12 md:mt-24 w-full max-w-xl space-y-8 md:space-y-12">
        {/* Tab Navigation */}
        <div className="flex p-1.5 space-x-2 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
          <button
            onClick={() => setActiveTab('shield')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
              activeTab === 'shield'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield className="w-4 h-4" />
            Shielded Wallet
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
              activeTab === 'link'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            Receive
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
              activeTab === 'keys'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
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
      </div>
    </main>
  );
}
