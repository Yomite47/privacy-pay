"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { paymentEngine } from "@/lib/solana/paymentEngine";

export function PayPageClient() {
  const searchParams = useSearchParams();
  const wallet = useWallet();

  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [rawM, setRawM] = useState(searchParams.get("m") ?? "");
  const [refFromLink, setRefFromLink] = useState(searchParams.get("ref") ?? "");
  const [isVerified, setIsVerified] = useState(false);

  const [amountSol, setAmountSol] = useState(() => {
    const paramAmount = searchParams.get("amountLamports");
    if (paramAmount) {
       const parsed = Number(paramAmount);
       if (Number.isFinite(parsed) && parsed > 0) {
          return (parsed / 1_000_000_000).toString();
       }
    }
    return "";
  });

  // Basic "Verification" Logic (Mock)
  // In a real app, this would check against a trusted registry or domain service (SNS)
  useEffect(() => {
    if (to && to.length >= 32) {
      // Mock: Just checking structure for now. 
      // Ideally, check if it's a known merchant or SNS handle.
      setIsVerified(false); 
    }
  }, [to]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        
        const hashTo = params.get("to");
        if (hashTo) setTo(hashTo);
        
        const hashM = params.get("m");
        if (hashM) setRawM(hashM);
        
        const hashRef = params.get("ref");
        if (hashRef) setRefFromLink(hashRef);

        const hashAmount = params.get("amountLamports");
        if (hashAmount) {
           const parsed = Number(hashAmount);
           if (Number.isFinite(parsed) && parsed > 0) {
              setAmountSol((parsed / 1_000_000_000).toString());
           }
        }
      } catch (e) {
        console.error("Failed to parse hash params", e);
      }
    }
  }, []);

  const encryptedMemoBlob = rawM ? decodeURIComponent(rawM) : "";
  const hasEncryptedMemo = !!encryptedMemoBlob;

  const [sending, setSending] = useState(false);
  const [signature, setSignature] = useState("");
  const [explorerUrl, setExplorerUrl] = useState("");
  const [receipt, setReceipt] = useState("");
  const [claimLink, setClaimLink] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const amountLamportsDisplay = useMemo(() => {
    const parsed = Number(amountSol);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return "";
    }
    return Math.round(parsed * 1_000_000_000).toString();
  }, [amountSol]);

  const handleSend = async () => {
    setStatus("");
    setError("");
    setSignature("");
    setExplorerUrl("");
    setReceipt("");

    try {
      if (!wallet.publicKey) {
        throw new Error("Connect your wallet to send a payment.");
      }

      if (!to.trim()) {
        throw new Error("Receiver address is missing in the link.");
      }

      try {
        const candidate = new PublicKey(to.trim());
        if (!PublicKey.isOnCurve(candidate.toBytes())) {
          throw new Error("Receiver address is not a valid Solana public key.");
        }
      } catch {
        throw new Error("Receiver address is not a valid Solana public key.");
      }

      const parsedSol = Number(amountSol);
      if (!Number.isFinite(parsedSol) || parsedSol <= 0) {
        throw new Error("Enter an amount in SOL greater than 0.");
      }

      const amountLamports = Math.round(parsedSol * 1_000_000_000);

      setSending(true);

      const { signature: sig } = await paymentEngine.sendPayment({
        payer: wallet,
        toPubkey: to.trim(),
        amountLamports,
        encryptedMemo: encryptedMemoBlob,
      });

      const explorer = `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

      setSignature(sig);
      setExplorerUrl(explorer);

      // Use ref from link if available, otherwise generate fallback
      const ref = refFromLink || (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `ref-${Date.now()}`);

      const receiptPayload = {
        ref,
        signature: sig,
        from: wallet.publicKey.toBase58(),
        to: to.trim(),
        amountLamports,
        encryptedMemo: encryptedMemoBlob || "",
        createdAt: Date.now(),
      };

      setReceipt(JSON.stringify(receiptPayload, null, 2));
      
      // Generate Claim Link
      if (typeof window !== "undefined") {
        const receiptJson = JSON.stringify(receiptPayload);
        const encodedReceipt = encodeURIComponent(receiptJson);
        const link = `${window.location.origin}/inbox#receipt=${encodedReceipt}`;
        setClaimLink(link);
      }

      setStatus("Payment sent on devnet. Receipt generated.");
    } catch (e) {
      if (e instanceof Error) {
        if (e.message.includes("blockhash") || e.message.includes("simulation")) {
          setError("Transaction failed. Please check if your wallet is on Devnet and has SOL.");
        } else {
          setError(e.message);
        }
      } else {
        setError("Failed to send payment.");
      }
    } finally {
      setSending(false);
    }
  };

  const handleCopyClaimLink = async () => {
    if (!claimLink) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(claimLink);
        setStatus("Claim Link copied! Send this to the receiver.");
      } else {
        setStatus("Clipboard is not available.");
      }
    } catch {
      setStatus("Failed to copy link.");
    }
  };

  const handleCopyReceipt = async () => {
    if (!receipt) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(receipt);
        setStatus("Receipt JSON copied to clipboard.");
      } else {
        setStatus("Clipboard is not available in this browser.");
      }
    } catch {
      setStatus("Failed to copy receipt.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black text-white">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Make a Payment
          </h1>
          <p className="mt-2 text-slate-400">
            Securely send SOL with an encrypted memo.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="space-y-6">
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-black/30 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Receiver</span>
                {isVerified ? (
                  <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30">Verified</span>
                ) : (
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">Unverified Address</span>
                )}
              </div>
              <code className="text-xs font-mono text-white break-all">
                {to || "not specified"}
              </code>
              {!isVerified && to && (
                <div className="text-[10px] text-amber-500/80 mt-1">
                  ⚠️ Verify this address carefully before sending funds.
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">
                Amount (SOL)
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-700 bg-black px-4 py-3 text-lg font-bold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                  value={amountSol}
                  onChange={(e) => setAmountSol(e.target.value)}
                  placeholder="0.00"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 pointer-events-none">
                  SOL
                </div>
              </div>
              {amountLamportsDisplay && (
                <p className="mt-1 text-[10px] text-slate-500 font-mono text-right px-1">
                  ≈ {amountLamportsDisplay} lamports
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Private Memo
                </label>
                {hasEncryptedMemo ? (
                   <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-900/50">
                    Encrypted & Attached
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 italic">Optional</span>
                )}
              </div>
              
              {hasEncryptedMemo ? (
                <div className="rounded-lg border border-indigo-900/50 bg-indigo-900/10 p-4">
                  <p className="text-xs text-slate-400 italic mb-2">
                    This memo is encrypted. Only the receiver can read it.
                  </p>
                  <div className="p-3 rounded-lg bg-black/30 border border-slate-800 font-mono text-[10px] text-slate-500 break-all">
                    {encryptedMemoBlob}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/50 p-6 text-center">
                  <p className="text-xs text-slate-500">
                    No private memo attached.
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50">
                <p className="text-sm font-medium text-red-400 flex items-center gap-3">
                  {error}
                </p>
              </div>
            )}

            {signature ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-900/20 border border-emerald-900/50">
                  <p className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-2">
                    Payment Successful!
                  </p>
                  <p className="text-xs text-slate-400 mb-3">
                    Your transaction has been confirmed on the Solana Devnet.
                  </p>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-white transition-colors underline"
                    >
                      View on Solana Explorer
                    </a>
                  )}
                </div>

                <div className="rounded-lg border border-slate-800 bg-black/30 p-4">
                  <h3 className="text-sm font-bold text-white mb-2">
                    Payment Receipt
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Share this receipt with the receiver so they can add it to their inbox.
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCopyReceipt}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700 transition-colors"
                    >
                      Copy Receipt
                    </button>
                    {claimLink && (
                       <button
                        type="button"
                        onClick={handleCopyClaimLink}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-900/30 border border-emerald-900/50 px-4 py-3 text-sm font-bold text-emerald-400 hover:bg-emerald-900/50 transition-colors"
                      >
                        Copy Claim Link
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !wallet.connected}
                className="w-full rounded-lg bg-indigo-600 px-4 py-4 text-sm font-bold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <span className="flex items-center justify-center gap-2">
                    Processing...
                  </span>
                ) : !wallet.connected ? (
                  "Connect Wallet to Pay"
                ) : (
                  "Send Payment"
                )}
              </button>
            )}

            {!wallet.connected && (
              <div className="mt-4 text-center">
                 <p className="text-xs text-amber-400/80 bg-amber-900/20 border border-amber-900/50 px-3 py-2 rounded-lg inline-block">
                    Please connect your Solana wallet (Devnet)
                 </p>
              </div>
            )}
            
            {status && !signature && (
               <div className="mt-2 text-center">
                 <p className="text-xs text-emerald-400">{status}</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
