"use client";

import { useState } from "react";
import { useViewingKey } from "@/hooks/useViewingKey";

export function ViewingKeyPanel() {
  const { viewingKey, isGenerating, error, generate, revoke } = useViewingKey();
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const copyPublicKey = async () => {
    if (!viewingKey) return;
    await navigator.clipboard.writeText(viewingKey.publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[15px] font-medium text-[color:var(--color-text-primary)]">
          Viewing Key
        </div>
        <div className="mt-1 text-[13px] text-[color:var(--color-text-secondary)] leading-relaxed">
          Share your public viewing key with auditors or Range Protocol. They can
          decrypt your transaction history but cannot spend any funds.
        </div>
      </div>

      {!viewingKey ? (
        <div className="cipher-card space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-[2px] text-[color:var(--color-text-muted)]">
              <LockIcon />
            </div>
            <div>
              <div className="text-[14px] font-medium text-[color:var(--color-text-primary)]">
                No viewing key generated
              </div>
              <div className="mt-1 text-[13px] text-[color:var(--color-text-muted)]">
                Generate a viewing key to enable selective disclosure. Your wallet
                will sign a message — no funds move.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={isGenerating}
            className="cipher-btn-primary w-full disabled:opacity-50"
          >
            {isGenerating ? (
              <span className="inline-flex items-center gap-2">
                <span className="animate-spin">↻</span> Signing…
              </span>
            ) : (
              "Generate viewing key"
            )}
          </button>
          {error && (
            <div className="text-[12px] text-[color:var(--color-amber)]">{error}</div>
          )}
        </div>
      ) : (
        <div className="cipher-card space-y-4">
          {/* Public key — safe to share */}
          <div className="space-y-1">
            <div className="cipher-label">PUBLIC VIEWING KEY (share with auditors)</div>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-[11px] text-[color:var(--color-text-secondary)] truncate">
                {viewingKey.publicKey}
              </div>
              <button
                type="button"
                onClick={() => void copyPublicKey()}
                className="cipher-btn-ghost h-[34px] px-3 text-[12px] shrink-0"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Secret key — hidden by default */}
          <div className="space-y-1">
            <div className="cipher-label">SECRET VIEWING KEY (never share)</div>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-[11px] text-[color:var(--color-text-secondary)] truncate">
                {showSecret ? viewingKey.secretKey : "•".repeat(44)}
              </div>
              <button
                type="button"
                onClick={() => setShowSecret((s) => !s)}
                className="cipher-btn-ghost h-[34px] px-3 text-[12px] shrink-0"
              >
                {showSecret ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] px-4 py-3 text-[12px] text-[color:var(--color-text-muted)]">
            <span className="font-medium text-[color:var(--color-text-primary)]">How to use:</span>{" "}
            Share the <span className="font-mono text-[11px]">public viewing key</span> with
            Range Protocol or your auditor. They pass it to the Cipher Pay verification
            API to decrypt your transaction history. You can regenerate this key at any
            time — it revokes all previous auditor access.
          </div>

          <button
            type="button"
            onClick={revoke}
            className="cipher-btn-ghost w-full text-[13px] text-[color:var(--color-amber)] border-[color:var(--color-amber)] hover:bg-[color:var(--color-amber)] hover:text-white"
          >
            Revoke viewing key
          </button>
        </div>
      )}
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.5 11V8.5a4.5 4.5 0 0 1 9 0V11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.75 11h10.5c.966 0 1.75.784 1.75 1.75v6.5c0 .966-.784 1.75-1.75 1.75H6.75A1.75 1.75 0 0 1 5 19.25v-6.5c0-.966.784-1.75 1.75-1.75Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
