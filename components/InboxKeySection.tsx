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
      // Defer state update to avoid synchronous render warning
      setTimeout(() => setPublicKey(key), 0);
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
        "Sign this message to restore your Cipher Pay inbox keys.\n\nThis will overwrite any existing keys in this browser."
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
    <section className="w-full max-w-xl rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">
            Inbox Encryption Keys
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Manage your keys to decrypt private memos
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-900/50">
          <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide">Active</span>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleRestoreFromWallet}
            className="w-full rounded-lg bg-indigo-600 px-4 py-4 text-sm font-bold text-white hover:bg-indigo-500 transition-colors"
          >
            <div className="flex items-center justify-center gap-3">
              Restore Keys from Wallet Signature
            </div>
          </button>
          <p className="mt-3 text-center text-xs text-slate-500 max-w-xs mx-auto">
            Recommended: Uses your wallet signature to generate consistent keys across all your devices.
          </p>
        </div>

        <div className="pt-6 border-t border-slate-800">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-2 -m-2 rounded-lg hover:bg-slate-800 transition-colors">
              <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">
                Advanced Options
              </span>
              <div className="p-1 rounded-md text-slate-400 group-hover:text-white transition-colors">
                <svg className="w-4 h-4 transition-transform duration-300 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            
            <div className="mt-4 space-y-4">
              <div className="p-4 rounded-lg bg-black/30 border border-slate-800">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Public Encryption Key</p>
                    <code className="block w-full truncate text-xs font-mono text-emerald-400/80">
                      {publicKey || "No inbox encryption key available..."}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPublicKey}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                    title="Copy Key"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
                  >
                    Export Backup
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
                  >
                    Import Backup
                  </button>
                </div>

                <textarea
                  className="w-full h-24 rounded-lg border border-slate-700 bg-black p-4 text-[10px] font-mono text-slate-400 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                  placeholder="Paste exported inbox keys JSON here..."
                  value={exported}
                  onChange={(e) => setExported(e.target.value)}
                />
              </div>
            </div>
          </details>
        </div>
      </div>

      {status && (
        <div className="mt-6 p-3 rounded-lg bg-emerald-900/20 border border-emerald-900/50">
          <p className="text-xs font-medium text-emerald-400 flex items-center gap-2">
            {status}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-6 p-3 rounded-lg bg-red-900/20 border border-red-900/50">
          <p className="text-xs font-medium text-red-400 flex items-center gap-2">
            {error}
          </p>
        </div>
      )}
    </section>
  );
}
