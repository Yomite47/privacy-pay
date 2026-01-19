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
    <section className="mt-10 w-full max-w-xl rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-left">
      <h2 className="text-sm font-semibold text-slate-100">
        Create Payment Link (Phase 0)
      </h2>
      <p className="mt-1 text-[11px] text-slate-400">
        The memo, if provided, is encrypted with your inbox encryption key and
        cannot be read by the payer.
      </p>
      <div className="mt-3 space-y-2">
        <div>
          <label className="block text-[11px] text-slate-300">
            Receiver wallet address (your address)
          </label>
          <input
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="Receiver Solana address"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-300">
            Amount (lamports)
          </label>
          <input
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
            value={amountLamports}
            onChange={(e) => setAmountLamports(e.target.value)}
            placeholder="e.g. 1000000"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-300">
            Memo (optional, private)
          </label>
          <textarea
            className="mt-1 h-20 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            placeholder="Private memo, encrypted for your inbox only"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleGenerateLink}
          className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-900 hover:bg-white"
        >
          Generate Link
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="rounded-md bg-slate-800 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700"
        >
          Copy Link
        </button>
      </div>
      {link && (
        <div className="mt-3">
          <label className="block text-[11px] text-slate-300">
            Generated link
          </label>
          <textarea
            className="mt-1 h-16 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
            value={link}
            readOnly
          />
        </div>
      )}
      {status && (
        <p className="mt-2 text-[11px] text-emerald-400">
          {status}
        </p>
      )}
      {error && (
        <p className="mt-2 text-[11px] text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}

