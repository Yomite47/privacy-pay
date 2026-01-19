"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getOrCreateInboxKeypair } from "@/lib/crypto/keys";
import { decryptMemo } from "@/lib/crypto/encrypt";

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

export default function InboxPage() {
  const wallet = useWallet();
  const [receiptInput, setReceiptInput] = useState("");
  const [items, setItems] = useState<InboxItem[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = loadStoredReceipts();
    const inboxItems: InboxItem[] = stored.map((r) => ({
      receipt: r,
      decryptedMemo: "",
      decryptError: "",
    }));
    setItems(inboxItems);
  }, []);

  const handleAddReceipt = () => {
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
      setStatus(
        !wallet.connected
          ? "Receipt added. Connect wallet to verify receiver address."
          : "Receipt added to inbox."
      );
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Failed to parse receipt.");
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
            Paste receipt
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Paste receipt to add payment.
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
            type="button"
            onClick={handleAddReceipt}
            className="mt-2 rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-900 hover:bg-white"
          >
            Add to inbox
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

        <section className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-slate-400">
              No inbox items yet. Paste a receipt to get started.
            </p>
          )}
          {items.map((item, index) => {
            const solAmount = item.receipt.amountLamports / 1_000_000_000;
            const explorerUrl = `https://explorer.solana.com/tx/${item.receipt.signature}?cluster=devnet`;

            return (
              <div
                key={`${item.receipt.ref}-${index}`}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200"
              >
                <p className="text-xs text-slate-400">
                  Ref: {item.receipt.ref || "n/a"}
                </p>
                <p className="text-xs text-slate-400">
                  From: {shorten(item.receipt.from)}
                </p>
                <p className="text-xs text-slate-400">
                  To: {shorten(item.receipt.to)}
                </p>
                <p className="text-xs text-slate-400">
                  Amount: {solAmount.toString()} SOL
                </p>
                <p className="text-xs text-slate-400">
                  Signature:{" "}
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 underline"
                  >
                    {shorten(item.receipt.signature)}
                  </a>
                </p>
                {item.receipt.encryptedMemo && (
                  <p className="mt-2 text-xs text-emerald-400">
                    Private memo attached (encrypted).
                  </p>
                )}
                {!item.receipt.encryptedMemo && (
                  <p className="mt-2 text-xs text-slate-400">
                    No private memo attached.
                  </p>
                )}
                <p className="mt-1 text-[11px] text-slate-400">
                  If you imported the wrong keys, memo decryption will fail.
                </p>
                {item.receipt.encryptedMemo && (
                  <button
                    type="button"
                    onClick={() => handleDecrypt(index)}
                    className="mt-2 rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-900 hover:bg-white"
                  >
                    Decrypt memo
                  </button>
                )}
                {item.decryptedMemo && (
                  <div className="mt-2 rounded-md border border-slate-700 bg-slate-950 p-2 text-[11px] text-slate-100">
                    {item.decryptedMemo}
                  </div>
                )}
                {item.decryptError && (
                  <p className="mt-2 text-[11px] text-red-400">
                    {item.decryptError}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
