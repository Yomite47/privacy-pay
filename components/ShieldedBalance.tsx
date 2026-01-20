"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { 
  getShieldedBalance, 
  getShieldedHistory,
  type ShieldedActivity,
  createShieldTransaction, 
  createUnshieldTransaction,
  createShieldedTransferTransaction
} from "@/lib/solana/lightProtocol";

export function ShieldedBalance() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [history, setHistory] = useState<ShieldedActivity[]>([]);
  
  // Action state
  const [mode, setMode] = useState<'none' | 'shield' | 'unshield' | 'transfer'>('none');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    if (!publicKey) return;
    setLoadingBalance(true);
    const [bal, hist] = await Promise.all([
      getShieldedBalance(publicKey),
      getShieldedHistory(publicKey)
    ]);
    setBalance(bal);
    setHistory(hist);
    setLoadingBalance(false);
  };

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      setHistory([]);
      return;
    }

    fetchData();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [publicKey]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !amount) return;

    try {
      setProcessing(true);
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) {
        throw new Error("Invalid amount");
      }

      let tx;
      if (mode === 'shield') {
         tx = await createShieldTransaction(publicKey, val);
      } else if (mode === 'unshield') {
         tx = await createUnshieldTransaction(publicKey, val);
      } else if (mode === 'transfer') {
         if (!recipient) throw new Error("Recipient address is required");
         let recipientPubkey;
         try {
           recipientPubkey = new PublicKey(recipient);
         } catch {
           throw new Error("Invalid recipient address");
         }
         tx = await createShieldedTransferTransaction(publicKey, recipientPubkey, val);
      } else {
        return;
      }
      
      const signature = await sendTransaction(tx, connection);
      
      // Wait for confirmation
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      });
      
      // Reset and refresh
      setMode('none');
      setAmount('');
      setRecipient('');
      await fetchData();
      
    } catch (error: any) {
      console.error("Transaction failed:", error);
      alert("Transaction failed: " + (error.message || error.toString()));
    } finally {
      setProcessing(false);
    }
  };

  if (!publicKey) return null;

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Shielded Balance</h2>
          <p className="text-sm text-slate-400 mt-1">
            Private funds (ZK Compressed)
          </p>
        </div>
        <div className="text-right">
          {loadingBalance && balance === null ? (
            <div className="h-8 w-24 bg-slate-700 animate-pulse rounded"></div>
          ) : (
            <div className="text-3xl font-bold text-emerald-400">
              {balance?.toFixed(4) ?? "0.0000"} <span className="text-lg text-emerald-600">SOL</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {mode === 'none' ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-4">
            <button
              onClick={() => setMode('shield')}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Shield (Deposit)
            </button>
            <button
              onClick={() => setMode('unshield')}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Unshield (Withdraw)
            </button>
          </div>
          <button
            onClick={() => setMode('transfer')}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-2 px-4 rounded-lg transition-colors border border-slate-600"
          >
            Send Shielded Payment
          </button>
        </div>
      ) : (
        <form onSubmit={handleAction} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-slate-200">
              {mode === 'shield' ? 'Shield SOL' : mode === 'unshield' ? 'Unshield SOL' : 'Send Shielded SOL'}
            </h3>
            <button 
              type="button"
              onClick={() => { setMode('none'); setAmount(''); setRecipient(''); }}
              className="text-slate-400 hover:text-white"
              disabled={processing}
            >
              Cancel
            </button>
          </div>
          
          <div className="space-y-4">
            {mode === 'transfer' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Recipient Address</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:ring-1 focus:ring-emerald-500 outline-none font-mono text-sm"
                  placeholder="Solana Address"
                  disabled={processing}
                  autoFocus
                />
              </div>
            )}
            
            <div>
              <label className="block text-xs text-slate-400 mb-1">Amount (SOL)</label>
              <input
                type="number"
                step="0.000000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                placeholder="0.00"
                disabled={processing}
                autoFocus={mode !== 'transfer'}
              />
            </div>
            
            <button
              type="submit"
              disabled={processing || !amount || (mode === 'transfer' && !recipient)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
            >
              {processing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                mode === 'shield' ? 'Confirm Shield' : mode === 'unshield' ? 'Confirm Unshield' : 'Send Payment'
              )}
            </button>
          </div>
        </form>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">Recent Activity</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {history.map((activity) => (
              <div 
                key={activity.signature} 
                className="flex items-center justify-between p-3 rounded bg-slate-900/50 border border-slate-800 text-sm hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'shield' ? 'bg-emerald-500' : 
                    activity.type === 'unshield' ? 'bg-amber-500' : 
                    activity.type === 'transfer' ? 'bg-purple-500' : 'bg-slate-500'
                  }`} />
                  <div>
                    <div className="font-medium text-slate-200 capitalize">
                      {activity.type === 'shield' ? 'Deposit (Shield)' : 
                       activity.type === 'unshield' ? 'Withdraw (Unshield)' : 
                       activity.type === 'transfer' ? 'Shielded Transfer' : 'Unknown Interaction'}
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
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    View Explorer ↗
                  </a>
                  {activity.status === 'failed' && (
                    <div className="text-xs text-red-500 mt-0.5">Failed</div>
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
