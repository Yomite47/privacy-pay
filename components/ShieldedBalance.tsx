"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { 
  getShieldedHistory,
  type ShieldedActivity,
} from "@/lib/solana/lightProtocol";
import { 
  shieldFunds, 
  unshieldFunds, 
  sendZkPayment, 
  getCompressedBalance 
} from "@/lib/solana/engines/zkCompressedTransfer";
import { 
  Shield, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Send, 
  RefreshCw, 
  History,
  Wallet,
  X,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export function ShieldedBalance() {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [history, setHistory] = useState<ShieldedActivity[]>([]);
  
  // Action state
  const [mode, setMode] = useState<'none' | 'shield' | 'unshield' | 'transfer'>('none');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState(''); 

  const fetchData = async () => {
    if (!publicKey) return;
    setLoadingBalance(true);
    try {
        const balLamports = await getCompressedBalance(publicKey.toBase58());
        setBalance(balLamports / LAMPORTS_PER_SOL);
        
        try {
            const hist = await getShieldedHistory(publicKey);
            setHistory(hist);
        } catch (e) {
            console.warn("Failed to fetch history", e);
        }
    } catch (e) {
        console.error("Failed to fetch data", e);
    }
    setLoadingBalance(false);
  };

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      setHistory([]);
      return;
    }

    fetchData();
    
    // Refresh every 60 seconds to avoid 429 Rate Limits
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [publicKey]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !amount) return;

    try {
      setProcessing(true);
      setStatusMsg("Initializing...");
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) {
        throw new Error("Invalid amount");
      }
      const lamports = Math.floor(val * LAMPORTS_PER_SOL);

      let signature = "";
      if (mode === 'shield') {
         setStatusMsg("Shielding funds (Public -> Private)...");
         signature = await shieldFunds({
             payer: wallet,
             toPubkey: publicKey.toBase58(),
             amountLamports: lamports
         });
      } else if (mode === 'unshield') {
         setStatusMsg("Unshielding funds (Private -> Public)...");
         signature = await unshieldFunds({
            payer: wallet,
            toPubkey: publicKey.toBase58(),
            amountLamports: lamports
         });
      } else if (mode === 'transfer') {
         if (!recipient) throw new Error("Recipient address is required");
         setStatusMsg("Sending Private Payment...");
         signature = await sendZkPayment({
            payer: wallet,
            toPubkey: recipient,
            amountLamports: lamports
         });
      } else {
        return;
      }
      
      setStatusMsg("Transaction confirmed!");
      // Reset and refresh
      setMode('none');
      setAmount('');
      setRecipient('');
      
      // Refresh balance immediately and after a delay
      fetchData();
      setTimeout(fetchData, 2000);
      
    } catch (error: any) {
      console.error("Transaction failed:", error);
      setStatusMsg(`Error: ${error.message || error.toString()}`);
      // Don't close modal on error so user can see message
    } finally {
      setProcessing(false);
    }
  };

  if (!publicKey) return null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24 md:pb-0">
      {/* Main Balance Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-black rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl group">
        {/* Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none group-hover:bg-purple-500/20 transition-all duration-700" />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit backdrop-blur-md">
               <Shield className="w-3.5 h-3.5 text-emerald-400" />
               <span className="text-xs font-medium text-emerald-200">ZK Compressed</span>
            </div>
            <button
              onClick={fetchData}
              disabled={loadingBalance}
              className={`p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all ${loadingBalance ? 'animate-spin text-emerald-400' : 'text-slate-400 hover:text-white'}`}
              title="Refresh Balance"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
             <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider ml-1">Total Shielded Balance</h2>
             <div className="flex items-baseline gap-2">
                {loadingBalance && balance === null ? (
                   <div className="h-14 w-48 bg-white/10 animate-pulse rounded-xl" />
                ) : (
                   <span className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-slate-400">
                     {balance?.toFixed(4) ?? "0.0000"}
                   </span>
                )}
                <span className="text-xl font-bold text-emerald-500 mb-2">SOL</span>
             </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {mode === 'none' ? (
        <div className="grid grid-cols-2 gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <button
            onClick={() => setMode('shield')}
            className="group flex flex-col items-center justify-center gap-3 p-6 bg-slate-900/50 hover:bg-emerald-950/20 border border-white/10 hover:border-emerald-500/30 rounded-2xl transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300">
               <ArrowDownLeft className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-center">
               <div className="font-bold text-white group-hover:text-emerald-300 transition-colors">Deposit</div>
               <div className="text-xs text-slate-400">Shield Funds</div>
            </div>
          </button>

          <button
             onClick={() => setMode('unshield')}
             className="group flex flex-col items-center justify-center gap-3 p-6 bg-slate-900/50 hover:bg-amber-950/20 border border-white/10 hover:border-amber-500/30 rounded-2xl transition-all duration-300"
          >
             <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-300">
                <ArrowUpRight className="w-6 h-6 text-amber-400" />
             </div>
             <div className="text-center">
                <div className="font-bold text-white group-hover:text-amber-300 transition-colors">Withdraw</div>
                <div className="text-xs text-slate-400">Unshield Funds</div>
             </div>
          </button>

          <button
             onClick={() => setMode('transfer')}
             className="col-span-2 group flex items-center justify-between p-6 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 hover:from-purple-900/60 hover:to-indigo-900/60 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl transition-all duration-300 shadow-lg shadow-purple-900/10"
          >
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                   <Send className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-left">
                   <div className="font-bold text-white text-lg group-hover:text-purple-200 transition-colors">Send Private Payment</div>
                   <div className="text-xs text-purple-200/60">Transfer encrypted assets instantly</div>
                </div>
             </div>
             <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <ArrowUpRight className="w-4 h-4 text-white/50" />
             </div>
          </button>
        </div>
      ) : (
        /* Action Form */
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-300">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                 {mode === 'shield' && <div className="p-2 bg-emerald-500/20 rounded-lg"><ArrowDownLeft className="w-5 h-5 text-emerald-400"/></div>}
                 {mode === 'unshield' && <div className="p-2 bg-amber-500/20 rounded-lg"><ArrowUpRight className="w-5 h-5 text-amber-400"/></div>}
                 {mode === 'transfer' && <div className="p-2 bg-purple-500/20 rounded-lg"><Send className="w-5 h-5 text-purple-400"/></div>}
                 <span>
                    {mode === 'shield' ? 'Shield Funds' : mode === 'unshield' ? 'Unshield Funds' : 'Send Private Payment'}
                 </span>
              </h3>
              <button 
                 type="button"
                 onClick={() => { setMode('none'); setAmount(''); setRecipient(''); setStatusMsg(''); }}
                 className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                 <X className="w-5 h-5 text-slate-400" />
              </button>
           </div>
           
           <form onSubmit={handleAction} className="space-y-6">
              {mode === 'transfer' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Recipient Address</label>
                  <div className="relative">
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-11 pr-4 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none font-mono text-sm transition-all"
                      placeholder="Solana Address"
                      disabled={processing}
                      autoFocus
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Amount</label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">SOL</div>
                  <input
                    type="number"
                    step="0.000000001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-14 pr-4 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none font-mono text-xl transition-all"
                    placeholder="0.00"
                    disabled={processing}
                    autoFocus={mode !== 'transfer'}
                  />
                </div>
              </div>
              
              {statusMsg && (
                  <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${statusMsg.startsWith("Error") ? "bg-red-500/10 border border-red-500/20 text-red-300" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"}`}>
                      {statusMsg.startsWith("Error") ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                      {statusMsg}
                  </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={processing || !amount || (mode === 'transfer' && !recipient)}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg transition-all flex justify-center items-center gap-2 ${
                    mode === 'shield' 
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-900/20' 
                      : mode === 'unshield'
                        ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-900/20'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-900/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    mode === 'shield' ? 'Confirm Deposit' : mode === 'unshield' ? 'Confirm Withdrawal' : 'Send Payment'
                  )}
                </button>
                <button 
                  type="button"
                  onClick={() => { setMode('none'); setAmount(''); setRecipient(''); setStatusMsg(''); }}
                  className="w-full mt-3 py-3 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors"
                  disabled={processing}
                >
                  Cancel
                </button>
              </div>
           </form>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="pt-8 border-t border-white/5">
          <div className="flex items-center gap-2 mb-4 px-1">
             <History className="w-4 h-4 text-slate-400" />
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {history.map((activity) => (
              <div 
                key={activity.signature} 
                className="group flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === 'shield' ? 'bg-emerald-500/10 text-emerald-400' : 
                    activity.type === 'unshield' ? 'bg-amber-500/10 text-amber-400' : 
                    activity.type === 'transfer' ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-500/10 text-slate-400'
                  }`}>
                     {activity.type === 'shield' ? <ArrowDownLeft className="w-5 h-5" /> : 
                      activity.type === 'unshield' ? <ArrowUpRight className="w-5 h-5" /> : 
                      activity.type === 'transfer' ? <Send className="w-5 h-5" /> : <History className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 capitalize text-sm md:text-base">
                      {activity.type === 'shield' ? 'Deposit' : 
                       activity.type === 'unshield' ? 'Withdrawal' : 
                       activity.type === 'transfer' ? 'Transfer' : 'Interaction'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(activity.timestamp * 1000).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <a 
                    href={`https://explorer.solana.com/tx/${activity.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 group-hover:text-indigo-400 transition-colors"
                  >
                    Explorer <ArrowUpRight className="w-3 h-3" />
                  </a>
                  {activity.status === 'failed' && (
                    <div className="text-xs text-red-500 mt-0.5 font-bold">Failed</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
