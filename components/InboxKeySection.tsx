"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  getInboxPublicKeyBase58,
  exportInboxKeys,
  importInboxKeys,
  restoreKeysFromSignature,
} from "@/lib/crypto/keys";

export function InboxKeySection() {
  const wallet = useWallet();
  const [publicKey, setPublicKey] = useState<string>("");
  const [exported, setExported] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    try {
      const key = getInboxPublicKeyBase58();
      setPublicKey(key);
    } catch {
      // ignore
    }
  }, []);

  const handleCopyPublicKey = async () => {
    if (!publicKey) {
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(publicKey);
        setStatus("Public key copied to clipboard.");
      } else {
        setStatus("Clipboard is not available in this browser.");
      }
    } catch {
      setStatus("Failed to copy public key.");
    }
  };

  const handleExport = () => {
    try {
      const payload = exportInboxKeys();
      setExported(payload);
      setStatus("Inbox keys exported locally. Do not share the secret key.");
      setError("");
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Failed to export inbox keys.");
      }
    }
  };

  const handleImport = () => {
    if (!exported.trim()) {
      setError("Nothing to import. Paste exported JSON first.");
      return;
    }

    try {
      importInboxKeys(exported);
      const key = getInboxPublicKeyBase58();
      setPublicKey(key);
      setStatus("Inbox keys imported successfully.");
      setError("");
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Failed to import inbox keys.");
      }
    }
  };

  const handleRestoreFromWallet = async () => {
    setStatus("");
    setError("");

    if (!wallet.connected || !wallet.signMessage) {
      setError("Connect a wallet that supports message signing.");
      return;
    }

    try {
      const message = new TextEncoder().encode(
        "Sign this message to restore your Privacy Pay inbox keys.\n\nThis will overwrite any existing keys in this browser."
      );
      const signature = await wallet.signMessage(message);
      
      await restoreKeysFromSignature(signature);
      
      const key = getInboxPublicKeyBase58();
      setPublicKey(key);
      setStatus("Keys restored from wallet signature!");
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Failed to restore keys from wallet.");
      }
    }
  };

  return (
    <section className="mt-10 w-full max-w-xl rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-left">
      <h2 className="text-sm font-semibold text-slate-100">
        Inbox Encryption Public Key
      </h2>
      <p className="mt-1 text-xs text-slate-300">
        These keys encrypt your private memos, not your wallet.
      </p>
      <p className="mt-1 text-[11px] text-slate-400">
        Export keys (backup) if you switch browser or device.
      </p>
      <p className="mt-1 text-[11px] text-amber-300">
        Losing keys means losing ability to decrypt old memos.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-slate-950 px-2 py-1 text-[11px] text-slate-100">
          {publicKey || "No inbox encryption key available in this browser."}
        </code>
        <button
          type="button"
          onClick={handleCopyPublicKey}
          className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-900 hover:bg-white"
        >
          Copy
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md bg-slate-800 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700"
          >
            Export keys (backup)
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="rounded-md bg-slate-800 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700"
          >
            Import keys (restore)
          </button>
        </div>
        
        <div className="mt-2">
            <button
                type="button"
                onClick={handleRestoreFromWallet}
                className="w-full rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500"
            >
                Or restore keys from Wallet Signature (Easy)
            </button>
            <p className="mt-1 text-[10px] text-slate-400">
                Uses your wallet signature to generate consistent keys across devices.
            </p>
        </div>

        <textarea
          className="mt-1 h-28 w-full rounded-md border border-slate-700 bg-slate-950 p-2 text-[11px] text-slate-100"
          placeholder="Exported inbox keys JSON goes here. Do not share this with anyone."
          value={exported}
          onChange={(e) => setExported(e.target.value)}
        />
      </div>

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
