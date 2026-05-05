"use client";

import { useState } from "react";
import { useStealthAddress } from "@/hooks/useStealthAddress";

export function StealthAddressPanel() {
  const { stealthKP, payments, isGenerating, isScanning, error, generate, scan, revoke } =
    useStealthAddress();
  const [copiedMeta, setCopiedMeta] = useState(false);

  const copyMetaAddress = async () => {
    if (!stealthKP) return;
    await navigator.clipboard.writeText(stealthKP.metaAddress.x25519PublicKey);
    setCopiedMeta(true);
    setTimeout(() => setCopiedMeta(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[15px] font-medium text-[color:var(--color-text-primary)]">
          Stealth Address
        </div>
        <div className="mt-1 text-[13px] text-[color:var(--color-text-secondary)] leading-relaxed">
          Share your stealth meta-address so senders can pay you privately.
          Every payment goes to a unique one-time address — no on-chain link to your wallet.
        </div>
      </div>

      {!stealthKP ? (
        <div className="cipher-card space-y-4">
          <div className="text-[13px] text-[color:var(--color-text-muted)]">
            No stealth address generated. Once created, share your meta-address with anyone
            who wants to pay you privately.
          </div>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={isGenerating}
            className="cipher-btn-primary w-full disabled:opacity-50"
          >
            {isGenerating ? (
              <span className="inline-flex items-center gap-2">
                <span className="animate-spin">↻</span> Generating…
              </span>
            ) : (
              "Generate stealth address"
            )}
          </button>
          {error && <div className="text-[12px] text-[color:var(--color-amber)]">{error}</div>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="cipher-card space-y-4">
            <div className="space-y-1">
              <div className="cipher-label">STEALTH META-ADDRESS (share publicly)</div>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-bg)] px-3 py-2 font-mono text-[11px] text-[color:var(--color-text-secondary)] truncate">
                  {stealthKP.metaAddress.x25519PublicKey}
                </div>
                <button
                  type="button"
                  onClick={() => void copyMetaAddress()}
                  className="cipher-btn-ghost h-[34px] px-3 text-[12px] shrink-0"
                >
                  {copiedMeta ? "✓" : "Copy"}
                </button>
              </div>
              <div className="text-[11px] text-[color:var(--color-text-muted)]">
                Anyone with this key can send you private payments. They cannot track or
                link payments to each other or to your main wallet.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void scan()}
                disabled={isScanning}
                className="cipher-btn-primary flex-1 disabled:opacity-50"
              >
                {isScanning ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin">↻</span> Scanning…
                  </span>
                ) : (
                  "Scan for payments"
                )}
              </button>
              <button
                type="button"
                onClick={revoke}
                className="cipher-btn-ghost text-[13px] text-[color:var(--color-amber)]"
              >
                Revoke
              </button>
            </div>

            {error && <div className="text-[12px] text-[color:var(--color-amber)]">{error}</div>}
          </div>

          {payments.length > 0 && (
            <div className="cipher-card space-y-3">
              <div className="cipher-label">STEALTH PAYMENTS FOUND</div>
              {payments.map((p) => (
                <div
                  key={p.signature}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-bg)] px-3 py-2"
                >
                  <div className="text-[color:var(--color-emerald)]">
                    <ShieldIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] text-[color:var(--color-text-primary)] truncate">
                      {p.stealthAddress}
                    </div>
                    <div className="text-[11px] text-[color:var(--color-text-muted)]">
                      Tx: {p.signature.slice(0, 12)}…
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isScanning && payments.length === 0 && (
            <div className="text-[12px] text-[color:var(--color-text-muted)]">
              No stealth payments found in the last 20 transactions. Scan again after
              someone sends you a stealth payment.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 19 6.5v6.1c0 5.1-3.4 8.7-7 9.9-3.6-1.2-7-4.8-7-9.9V6.5L12 3Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
