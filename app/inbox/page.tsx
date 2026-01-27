"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSearchParams } from "next/navigation";
import { 
  getOrCreateInboxKeypair, 
  deriveKeysFromSignature, 
  setMemoryKeypair, 
  getMemoryKeypair 
} from "@/lib/crypto/keys";
import { decryptMemo } from "@/lib/crypto/encrypt";
import { verifyTransaction } from "@/lib/solana/verify";

type ReceiptRecord = {
  ref: string;
  signature: string;
  from: string;
  to: string;
  amountLamports: number;
  encryptedMemo: string;
  createdAt: number;
  type?: 'public' | 'private';
};

type InboxItem = {
  receipt: ReceiptRecord;
  decryptedMemo: string;
  decryptError: string;
};

type SentItem = ReceiptRecord & {
    memoText?: string;
};

const INBOX_STORAGE_KEY = "pp_inbox_receipts";
const SENT_STORAGE_KEY = "pp_sent_receipts";

function shorten(value: string) {
  if (!value) return "n/a";
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function loadStoredReceipts(owner?: string): ReceiptRecord[] {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return [];
  }
  if (!owner) return [];

  try {
    const key = `${INBOX_STORAGE_KEY}_${owner}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ReceiptRecord[];
  } catch {
    return [];
  }
}

function loadSentReceipts(owner?: string): SentItem[] {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return [];
    }
    if (!owner) return [];

    try {
      const key = `${SENT_STORAGE_KEY}_${owner}`;
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed as SentItem[];
    } catch {
      return [];
    }
  }

function saveStoredReceipts(receipts: ReceiptRecord[], owner?: string) {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined" || !owner) {
    return;
  }
  const key = `${INBOX_STORAGE_KEY}_${owner}`;
  window.localStorage.setItem(key, JSON.stringify(receipts));
}

function InboxContent() {
  const wallet = useWallet();
  const searchParams = useSearchParams();
  
  const [receiptInput, setReceiptInput] = useState("");
  const [items, setItems] = useState<InboxItem[]>([]);
  const [sentItems, setSentItems] = useState<SentItem[]>([]);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Check if keys are already in memory
  useEffect(() => {
    if (getMemoryKeypair()) {
      setIsUnlocked(true);
    }
  }, [wallet.publicKey]); // Re-check if wallet changes

  const handleUnlock = async () => {
    setError("");
    setStatus("");
    try {
      if (!wallet.connected || !wallet.signMessage) {
        throw new Error("Please connect a wallet that supports message signing.");
      }
      
      const message = new TextEncoder().encode("Unlock Privacy Pay Inbox");
      const signature = await wallet.signMessage(message);
      
      const keypair = deriveKeysFromSignature(signature);
      setMemoryKeypair(keypair);
      setIsUnlocked(true);
      setStatus("Inbox unlocked successfully.");
    } catch (e) {
      console.error(e);
      setError("Failed to unlock inbox. You must sign the message.");
    }
  };

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
    const owner = wallet.publicKey?.toBase58();
    const stored = loadStoredReceipts(owner);
    const inboxItems: InboxItem[] = stored.map((r) => ({
      receipt: r,
      decryptedMemo: "",
      decryptError: "",
    }));
    setItems(inboxItems);

    const sent = loadSentReceipts(owner);
    setSentItems(sent);
  }, [wallet.publicKey]);

  const handleAddReceipt = async () => {
    setStatus("");
    setError("");

    if (!receiptInput.trim()) {
      setError("Paste a receipt JSON first.");
      return;
    }

    let jsonString = receiptInput.trim();

    // Check if input is a URL (starts with http) or contains receipt= param
    if (jsonString.startsWith("http") || jsonString.includes("receipt=")) {
        try {
            // Attempt to parse as URL to extract receipt param
            // We use a dummy base if it's just a fragment/path
            const urlToParse = jsonString.startsWith("http") ? jsonString : `http://dummy.com/${jsonString}`;
            const urlObj = new URL(urlToParse);
            
            let extracted = urlObj.searchParams.get("receipt");
            
            if (!extracted && urlObj.hash) {
                // Check hash params (e.g. #receipt=...)
                const hashContent = urlObj.hash.startsWith("#") ? urlObj.hash.substring(1) : urlObj.hash;
                const hashParams = new URLSearchParams(hashContent);
                extracted = hashParams.get("receipt");
            }

            if (extracted) {
                jsonString = decodeURIComponent(extracted);
            } else {
                // If no receipt param found but it looks like a Pay Link
                if (jsonString.includes("/pay#") || jsonString.includes("/pay?")) {
                    throw new Error("This is a Payment Request link, not a Receipt. Please use the 'Receipt Link' generated after the payment is completed.");
                }
            }
        } catch (e) {
            if (e instanceof Error && e.message.includes("Payment Request link")) {
                throw e;
            }
            console.warn("Failed to parse receipt input as URL:", e);
            // Fallback: treat original input as potential JSON
        }
    }

    try {
      const parsed = JSON.parse(jsonString) as Partial<ReceiptRecord>;

      if (!parsed.ref && parsed.signature) {
        parsed.ref = parsed.signature;
      }

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
      
      const verification = await verifyTransaction(
        parsed.signature,
        parsed.from,
        parsed.to,
        parsed.amountLamports,
        parsed.encryptedMemo,
        parsed.type || 'public'
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
        type: parsed.type || 'public'
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
        saveStoredReceipts(toStore, wallet.publicKey?.toBase58());
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
        const memoryKeypair = getMemoryKeypair();
        const localKeypair = getOrCreateInboxKeypair();
        
        let decrypted = "";
        let error = "";

        // Strategy 1: Try Memory Key (Wallet Identity) if available
        if (memoryKeypair) {
            try {
                decrypted = decryptMemo(target.receipt.encryptedMemo, memoryKeypair.secretKey);
            } catch (e) {
                // If failed, fall through to Strategy 2
                console.warn("Failed to decrypt with Wallet Key, trying Device Key...");
            }
        }

        // Strategy 2: Try Local Key (Device Identity) if not already decrypted
        if (!decrypted && localKeypair) {
             try {
                decrypted = decryptMemo(target.receipt.encryptedMemo, localKeypair.secretKey);
                if (decrypted) {
                    setStatus("Memo decrypted using your local device key.");
                }
            } catch (e) {
                error = "Unable to decrypt memo (wrong key or corrupted data).";
            }
        }

        if (!decrypted && !error) {
             if (!memoryKeypair && !localKeypair) {
                 error = "Inbox is locked and no device key found.";
             } else {
                 error = "Unable to decrypt memo (wrong key).";
             }
        }

        if (decrypted) {
            target.decryptedMemo = decrypted;
            target.decryptError = "";
        } else {
            target.decryptedMemo = "";
            target.decryptError = error;
        }

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
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 pb-24 md:pb-8 bg-black text-white">
      <div className="w-full max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Inbox
            </h1>
            <p className="text-slate-400 mt-1">Manage your payment receipts and encrypted memos.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-800">
            <button
                onClick={() => setActiveTab('received')}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                    activeTab === 'received' 
                    ? 'bg-slate-800 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
            >
                Received
            </button>
            <button
                onClick={() => setActiveTab('sent')}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                    activeTab === 'sent' 
                    ? 'bg-slate-800 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
            >
                Sent
            </button>
        </div>

        {activeTab === 'received' && (
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            Unlock Inbox
          </h2>
          <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
            <p className="text-sm text-slate-300 mb-2">
              For your security, your inbox keys are derived from your wallet signature. 
              They are never stored on disk.
            </p>
            {!isUnlocked ? (
               <button 
                 onClick={handleUnlock}
                 className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded transition-colors"
               >
                 Sign to Unlock Inbox
               </button>
            ) : (
               <div className="flex items-center gap-2 text-green-400 font-bold">
                 <span>🔓 Inbox Unlocked</span>
               </div>
            )}
          </div>
        </section>
        )}

        {activeTab === 'received' && (
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            Add Payment
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
              <div className="bg-black/30 p-3 rounded border border-slate-800">
                <p className="font-semibold text-slate-300 mb-1">Receipt JSON</p>
                Paste the raw receipt JSON or use a "Claim Link" to auto-fill.
              </div>
              <div className="bg-black/30 p-3 rounded border border-slate-800">
                <p className="font-semibold text-slate-300 mb-1">Decryption</p>
                Only works if you have the matching keys in your local storage.
              </div>
            </div>
            
            <textarea
              className="w-full h-32 rounded-lg border border-slate-700 bg-black p-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono resize-none"
              value={receiptInput}
              onChange={(e) => setReceiptInput(e.target.value)}
              placeholder='Paste receipt JSON here: {"ref":"...", "signature":"...", ...}'
            />
            
            <button
              onClick={handleAddReceipt}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 transition-colors"
            >
              Add Payment to Inbox
            </button>
          </div>
        </section>
        )}

        {status && (
          <div className="p-4 rounded-lg bg-emerald-900/20 border border-emerald-900/50">
            <p className="text-sm font-medium text-emerald-400">
              {status}
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50">
            <p className="text-sm font-medium text-red-400">
              {error}
            </p>
          </div>
        )}

        {activeTab === 'received' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white px-1">Your Receipts</h2>
          
          {items.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                <p>No received payments found locally.</p>
                <p className="text-xs mt-2 text-slate-600">Use the "Add Payment" form above to import a receipt.</p>
            </div>
          ) : (
            items.map((item, i) => (
            <div
              key={item.receipt.ref}
              className="rounded-lg border border-slate-800 bg-slate-900 p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 bg-black px-2 py-0.5 rounded border border-slate-800">
                      {new Date(item.receipt.createdAt).toLocaleString()}
                    </span>
                    {item.receipt.type === 'private' && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-900/40 flex items-center gap-1">
                            🛡️ ZK
                        </span>
                    )}
                    <a
                      href={`https://explorer.solana.com/tx/${item.receipt.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      View Tx
                    </a>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                    <span className="opacity-50">From:</span>
                    <span className="bg-black px-1.5 py-0.5 rounded text-slate-200">{shorten(item.receipt.from)}</span>
                    <Link 
                        href={`/pay?to=${item.receipt.from}&replyTo=${item.receipt.to}`}
                        className="ml-2 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-900/40 transition-colors"
                    >
                        Reply
                    </Link>
                  </div>
                </div>
                
                <div className="text-left sm:text-right">
                  <div className="text-2xl font-bold text-white tabular-nums">
                    {(item.receipt.amountLamports / 1_000_000_000).toLocaleString()} <span className="text-sm text-slate-500 font-normal">{item.receipt.type === 'private' ? 'ZK-SOL' : 'SOL'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800">
                {item.decryptedMemo ? (
                  <div className="bg-emerald-900/10 rounded p-3 border border-emerald-900/30">
                    <p className="text-[10px] text-emerald-500 uppercase tracking-wider font-bold mb-1">
                      Decrypted Memo
                    </p>
                    <p className="text-sm text-slate-200 font-medium">
                      {item.decryptedMemo}
                    </p>
                  </div>
                ) : item.decryptError ? (
                  <div className="bg-red-900/10 rounded p-3 border border-red-900/30 flex justify-between items-center">
                    <p className="text-xs text-red-400">
                      {item.decryptError}
                    </p>
                    <button 
                        onClick={() => handleDecrypt(i)}
                        className="text-[10px] text-red-300 underline hover:text-red-200"
                    >
                        Retry
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      Encrypted Message
                    </div>
                    <button
                      onClick={() => handleDecrypt(i)}
                      className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
                    >
                      Decrypt Message
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
          )}
        </div>
        )}

        {activeTab === 'sent' && (
            <div className="space-y-4">
            <h2 className="text-xl font-bold text-white px-1">Sent History</h2>
            {sentItems.length === 0 ? (
                 <div className="text-center py-12 text-slate-500">
                    <p>No sent transactions saved locally.</p>
                 </div>
            ) : (
                sentItems.map((item) => (
                    <div
                    key={item.ref}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-6 opacity-75 hover:opacity-100 transition-opacity"
                    >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500 bg-black px-2 py-0.5 rounded border border-slate-800">
                            {new Date(item.createdAt).toLocaleString()}
                            </span>
                            {item.type === 'private' && (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-900/40 flex items-center gap-1">
                                    🛡️ ZK
                                </span>
                            )}
                            <a
                            href={`https://explorer.solana.com/tx/${item.signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                            View Tx
                            </a>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                            <span className="opacity-50">To:</span>
                            <span className="bg-black px-1.5 py-0.5 rounded text-slate-200">{shorten(item.to)}</span>
                        </div>
                        </div>
                        
                        <div className="text-left sm:text-right">
                        <div className="text-2xl font-bold text-white tabular-nums">
                            -{(item.amountLamports / 1_000_000_000).toLocaleString()} <span className="text-sm text-slate-500 font-normal">{item.type === 'private' ? 'ZK-SOL' : 'SOL'}</span>
                        </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800">
                        {item.memoText ? (
                        <div className="bg-slate-800/50 rounded p-3 border border-slate-700/50">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">
                            Memo (Raw Content)
                            </p>
                            <p className="text-xs text-slate-300 font-mono break-all">
                            {item.memoText}
                            </p>
                        </div>
                        ) : (
                        <p className="text-xs text-slate-500 italic">No memo attached</p>
                        )}
                    </div>
                    </div>
                ))
            )}
            </div>
        )}
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
