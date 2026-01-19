"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { paymentEngine } from "@/lib/solana/paymentEngine";

export function PayPageClient() {
  const searchParams = useSearchParams();
  const wallet = useWallet();

  const to = searchParams.get("to") ?? "";
  const rawM = searchParams.get("m");
  const refFromLink = searchParams.get("ref");
  const encryptedMemoBlob = rawM ? decodeURIComponent(rawM) : "";
  const hasEncryptedMemo = !!encryptedMemoBlob;

  const [amountSol, setAmountSol] = useState("");
  const [sending, setSending] = useState(false);
  const [signature, setSignature] = useState("");
  const [explorerUrl, setExplorerUrl] = useState("");
  const [receipt, setReceipt] = useState("");
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

  const handleCopyReceipt = async () => {
    if (!receipt) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(receipt);
        setStatus("Receipt copied to clipboard.");
      } else {
        setStatus("Clipboard is not available in this browser.");
      }
    } catch {
      setStatus("Failed to copy receipt.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 text-slate-50">
      <div className="w-full max-w-xl space-y-4 text-left">
        <h1 className="text-2xl font-semibold tracking-tight">
          Pay Link (Devnet, Phase 0)
        </h1>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
          <p>Receiver: {to || "not specified"}</p>
          <p className="mt-1 text-xs text-slate-400">
            You are sending SOL on devnet.
          </p>
          <div className="mt-3 space-y-2">
            <div>
              <label className="block text-[11px] text-slate-300">
                Amount (SOL)
              </label>
              <input
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                value={amountSol}
                onChange={(e) => setAmountSol(e.target.value)}
                placeholder="e.g. 0.1"
              />
              {amountLamportsDisplay && (
                <p className="mt-1 text-[11px] text-slate-400">
                  ≈ {amountLamportsDisplay} lamports
                </p>
              )}
            </div>
          </div>
          {hasEncryptedMemo && (
            <p className="mt-2 text-emerald-400">
              Private memo attached (encrypted). You can&apos;t read it.
            </p>
          )}
          {!hasEncryptedMemo && (
            <p className="mt-2 text-slate-400">
              No private memo attached.
            </p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            After sending, copy the receipt and send it to the receiver so they
            can add it to their inbox.
          </p>
          <div className="mt-2 rounded-md bg-amber-900/20 p-2">
            <p className="text-[11px] text-amber-200">
              Ensure your wallet is connected to <strong>Solana Devnet</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="mt-3 rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-900 hover:bg-white disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send on Devnet"}
          </button>
          {signature && (
            <div className="mt-3 text-xs text-slate-200">
              <p>Signature: {signature}</p>
              {explorerUrl && (
                <p className="mt-1">
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 underline"
                  >
                    View on Solana Explorer (devnet)
                  </a>
                </p>
              )}
            </div>
          )}
        </div>

        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
          <h2 className="text-sm font-semibold text-slate-100">
            Receipt (Phase 0)
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            The receipt is created after a successful send and contains only the
            encrypted memo blob, never plaintext.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleCopyReceipt}
              className="rounded-md bg-slate-800 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700"
            >
              Copy Receipt
            </button>
          </div>
          <textarea
            className="mt-3 h-28 w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-[11px] text-slate-100"
            value={receipt}
            readOnly
            placeholder="Receipt JSON will appear here after a successful payment."
          />
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
      </div>
    </main>
  );
}
