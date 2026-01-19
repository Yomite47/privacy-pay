"use client";

import { useEffect, useState, Suspense } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSearchParams } from "next/navigation";
import { getOrCreateInboxKeypair } from "@/lib/crypto/keys";
import { decryptMemo } from "@/lib/crypto/encrypt";
import { verifyTransactionOnChain } from "@/lib/solana/verify";

type ReceiptRecord = {
  ref: string;
  signature: string;
  from: string;
  to: string;
  amountLamports: number;
  encryptedMemo: string;
  createdAt: number;
};

type InboxItem = {
  receipt: ReceiptRecord;
  decryptedMemo: string;
  decryptError: string;
};

const INBOX_STORAGE_KEY = "pp_inbox_receipts";

function shorten(value: string) {
  if (!value) return "n/a";
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function loadStoredReceipts(): ReceiptRecord[] {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(INBOX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ReceiptRecord[];
  } catch {
    return [];
  }
}

function saveStoredReceipts(receipts: ReceiptRecord[]) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return;
  }
  window.localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(receipts));
}

function InboxContent() {
  const wallet = useWallet();
  const searchParams = useSearchParams();
  
  const [receiptInput, setReceiptInput] = useState("");
  const [items, setItems] = useState<InboxItem[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // Load receipt from URL if present (query param OR hash fragment)
  useEffect(() => {
    // Check query param (legacy/standard)
    const urlReceipt = searchParams.get("receipt");
    if (urlReceipt) {
      try {
        const decoded = decodeURIComponent(urlReceipt);
        setReceiptInput(decoded);
        setStatus("Receipt detected from link. Click 'Add Payment to Inbox' below.");
        return;
      } catch {
        setError("Invalid receipt link.");
      }
    }

    // Check hash fragment (privacy-preserving)
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.substring(1); // remove #
      const params = new URLSearchParams(hash);
      const hashReceipt = params.get("receipt");
      if (hashReceipt) {
         try {
          const decoded = decodeURIComponent(hashReceipt);
          setReceiptInput(decoded);
          setStatus("Receipt detected from secure link. Click 'Add Payment to Inbox' below.");
        } catch {
          setError("Invalid receipt link.");
        }
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const stored = loadStoredReceipts();
    const inboxItems: InboxItem[] = stored.map((r) => ({
      receipt: r,
      decryptedMemo: "",
      decryptError: "",
    }));
    setItems(inboxItems);
  }, []);

  const handleAddReceipt = async () => {
    setStatus("");
    setError("");

    if (!receiptInput.trim()) {
      setError("Paste a receipt JSON first.");
      return;
    }

    try {
      const parsed = JSON.parse(receiptInput) as Partial<ReceiptRecord>;

      if (!parsed.ref || typeof parsed.ref !== "string") {
        throw new Error("Receipt is missing ref.");
      }
      if (!parsed.signature || typeof parsed.signature !== "string") {
        throw new Error("Receipt is missing signature.");
      }
      if (!parsed.from || typeof parsed.from !== "string") {
        throw new Error("Receipt is missing from address.");
      }
      if (!parsed.to || typeof parsed.to !== "string") {
        throw new Error("Receipt is missing to address.");
      }
      if (typeof parsed.amountLamports !== "number" || parsed.amountLamports <= 0) {
        throw new Error("Receipt amountLamports must be a number greater than 0.");
      }
      if (
        typeof parsed.encryptedMemo !== "string" ||
        typeof parsed.createdAt !== "number"
      ) {
        throw new Error("Receipt must include encryptedMemo and createdAt.");
      }

      if (wallet.connected && wallet.publicKey && parsed.to !== wallet.publicKey.toBase58()) {
        throw new Error("Receipt is not addressed to your connected wallet.");
      }

      // Verify on-chain before adding!
      setStatus("Verifying transaction on Solana Devnet...");
      
      const verification = await verifyTransactionOnChain(
        parsed.signature,
        parsed.from,
        parsed.to,
        parsed.amountLamports,
        parsed.encryptedMemo
      );

      if (!verification.isValid) {
        throw new Error(verification.error || "Transaction verification failed.");
      }

      const record: ReceiptRecord = {
        ref: parsed.ref,
        signature: parsed.signature,
        from: parsed.from,
        to: parsed.to,
        amountLamports: parsed.amountLamports,
        encryptedMemo: parsed.encryptedMemo,
        createdAt: parsed.createdAt,
      };

      setItems((prev) => {
        // Check for duplicates
        if (prev.some(p => p.receipt.signature === record.signature)) {
            return prev;
        }
        const next: InboxItem[] = [
          {
            receipt: record,
            decryptedMemo: "",
            decryptError: "",
          },
          ...prev,
        ];
        const toStore = next.map((item) => item.receipt);
        saveStoredReceipts(toStore);
        return next;
      });

      setReceiptInput("");
      setStatus("Receipt verified and added to inbox.");
    } catch (e) {
      setStatus(""); // Clear verifying status
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Failed to parse or verify receipt.");
      }
    }
  };

  const handleDecrypt = (index: number) => {
    setStatus("");

    setItems((prev) => {
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;

      try {
        const keypair = getOrCreateInboxKeypair();
        const memoText = decryptMemo(target.receipt.encryptedMemo, keypair.secretKey);

        target.decryptedMemo = memoText;
        target.decryptError = "";
      } catch (e) {
        if (e instanceof Error) {
          target.decryptedMemo = "";
          target.decryptError = e.message;
        } else {
          target.decryptedMemo = "";
          target.decryptError = "Unable to decrypt memo.";
        }
      }

      return next;
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 text-slate-50">
      <div className="w-full max-w-2xl space-y-6 text-left">
        <h1 className="text-2xl font-semibold tracking-tight">
          Inbox (Phase 0)
        </h1>
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
          <h2 className="text-sm font-semibold text-slate-100">
            Add Payment
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Paste a receipt JSON below, or use a &quot;Claim Link&quot; to auto-fill.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Decrypt memo (only works if you have the right inbox keys).
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            If you cleared browser storage, import your keys first.
          </p>
          <textarea
            className="mt-2 h-24 w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-[11px] text-slate-100"
            value={receiptInput}
            onChange={(e) => setReceiptInput(e.target.value)}
            placeholder="Paste receipt JSON here"
          />
          <button
            onClick={handleAddReceipt}
            className="mt-3 rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-900 hover:bg-white"
          >
            Add Payment to Inbox
          </button>
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

        <div className="space-y-4">
          {items.map((item, i) => (
            <div
              key={item.receipt.ref}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400">
                    {new Date(item.receipt.createdAt).toLocaleString()}
                  </p>
                  <p className="font-mono text-xs text-slate-200">
                    From: {shorten(item.receipt.from)}
                  </p>
                  <p className="font-mono text-xs text-slate-200">
                    Amount: {item.receipt.amountLamports / 1_000_000_000} SOL
                  </p>
                </div>
                <div className="text-right">
                  <a
                    href={`https://explorer.solana.com/tx/${item.receipt.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-400 underline"
                  >
                    View Tx
                  </a>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-800 pt-3">
                {item.decryptedMemo ? (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                      Decrypted Memo
                    </p>
                    <p className="mt-1 text-sm text-emerald-300">
                      {item.decryptedMemo}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Encrypted Memo
                    </p>
                    <code className="mt-1 block truncate text-[10px] text-slate-600">
                      {item.receipt.encryptedMemo || "(none)"}
                    </code>
                    {item.decryptError && (
                      <p className="mt-2 text-[10px] text-red-400">
                        {item.decryptError}
                      </p>
                    )}
                    <button
                      onClick={() => handleDecrypt(i)}
                      className="mt-2 rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
                    >
                      Decrypt
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <p className="text-center text-xs text-slate-500">
              No receipts in inbox.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading inbox...</div>}>
      <InboxContent />
    </Suspense>
  );
}
