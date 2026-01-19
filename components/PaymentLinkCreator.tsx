"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getOrCreateInboxKeypair } from "@/lib/crypto/keys";
import { encryptMemo } from "@/lib/crypto/encrypt";

export function PaymentLinkCreator() {
  const { publicKey } = useWallet();
  const [toAddress, setToAddress] = useState("");
  const [amountLamports, setAmountLamports] = useState("");
  const [memoText, setMemoText] = useState("");
  const [link, setLink] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // Auto-fill receiver address from connected wallet
  useEffect(() => {
    if (publicKey) {
      setToAddress(publicKey.toBase58());
    }
  }, [publicKey]);

  const handleGenerateLink = () => {
    setStatus("");
    setError("");

    if (!toAddress.trim()) {
      setError("Receiver address is required.");
      return;
    }

    try {
      const receiverKeypair = getOrCreateInboxKeypair();

      let encryptedMemoBlob = "";
      if (memoText.trim()) {
        encryptedMemoBlob = encryptMemo(memoText, receiverKeypair.publicKey);
      }

      if (typeof window === "undefined") {
        throw new Error("Cannot generate link outside the browser.");
      }

      const baseUrl = `${window.location.origin}/pay`;
      const params = new URLSearchParams();

      if (toAddress.trim()) {
        params.set("to", toAddress.trim());
      }
      if (amountLamports.trim()) {
        params.set("amountLamports", amountLamports.trim());
      }

      // Generate a stable reference ID for the payment link
      const ref = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `ref-${Date.now()}`;
      params.set("ref", ref);

      const baseQuery = params.toString();
      let fullLink = baseUrl;

      const parts = [];
      if (baseQuery) parts.push(baseQuery);
      
      if (encryptedMemoBlob) {
        parts.push(`m=${encodeURIComponent(encryptedMemoBlob)}`);
      }

      if (parts.length > 0) {
        fullLink = `${baseUrl}#${parts.join("&")}`;
      }

      setLink(fullLink);
      setStatus("Payment link generated.");
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Failed to generate payment link.");
      }
    }
  };

  const handleCopyLink = async () => {
    if (!link) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
        setStatus("Payment link copied to clipboard.");
      } else {
        setStatus("Clipboard is not available in this browser.");
      }
    } catch {
      setStatus("Failed to copy payment link.");
    }
  };

  return (
    <section className="w-full rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              Create Payment Link
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Generate a secure link to receive SOL on Devnet
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">
              Receiver Address
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-black px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="Receiver Solana address"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">
              Amount (Lamports)
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-black px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
              value={amountLamports}
              onChange={(e) => setAmountLamports(e.target.value)}
              placeholder="e.g. 1000000"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 ml-1">
              <label className="block text-xs font-semibold text-slate-300">
                Private Memo
              </label>
              <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-medium bg-indigo-900/30 px-2 py-0.5 rounded-full">
                End-to-End Encrypted
              </span>
            </div>
            <textarea
              className="w-full h-24 rounded-lg border border-slate-700 bg-black px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder="Write a private note... Only the receiver can read this."
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleGenerateLink}
            className="flex-1 rounded-lg bg-white px-4 py-3 text-sm font-bold text-black hover:bg-slate-200 transition-colors"
          >
            Generate Secure Link
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-4 py-3 rounded-lg border border-slate-700 bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
            title="Copy Link"
          >
            Copy
          </button>
        </div>

        {link && (
          <div className="mt-6">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">
              Your Secure Link
            </label>
            <div className="relative group cursor-pointer" onClick={handleCopyLink}>
              <div className="absolute inset-0 bg-indigo-900/10 rounded-lg group-hover:bg-indigo-900/20 transition-colors" />
              <textarea
                className="w-full h-20 rounded-lg border border-indigo-900/50 bg-transparent px-4 py-3 text-xs text-indigo-400 font-mono focus:outline-none resize-none cursor-pointer"
                value={link}
                readOnly
              />
              <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-white font-medium">Click to Copy</span>
              </div>
            </div>
          </div>
        )}

        {status && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-900/20 border border-emerald-900/50">
            <p className="text-xs font-medium text-emerald-400 flex items-center gap-2">
              {status}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-900/50">
            <p className="text-xs font-medium text-red-400 flex items-center gap-2">
              {error}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

