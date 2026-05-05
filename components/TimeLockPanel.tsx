"use client";

import { useEffect, useState } from "react";
import { useTimeLock } from "@/hooks/useTimeLock";
import { formatDelay, type DelayBucket, type PendingPayment } from "@/lib/solana/time-lock";

const BUCKET_LABELS: Record<DelayBucket, { label: string; desc: string; color: string }> = {
  short:  { label: "2–15 min",  desc: "Casual observers", color: "var(--color-emerald)" },
  medium: { label: "15–60 min", desc: "Analytics tools",  color: "var(--color-accent)" },
  long:   { label: "1–6 hrs",   desc: "Persistent surveillance", color: "var(--color-amber)" },
};

function Countdown({ executeAt }: { executeAt: number }) {
  const [remaining, setRemaining] = useState(executeAt - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemaining(executeAt - Date.now()), 1000);
    return () => clearInterval(id);
  }, [executeAt]);

  if (remaining <= 0) return <span className="text-[color:var(--color-emerald)]">Ready to send</span>;
  return <span>{formatDelay(remaining)}</span>;
}

function PaymentRow({
  payment,
  onCancel,
  isProcessing,
}: {
  payment: PendingPayment;
  onCancel: (id: string) => void;
  isProcessing: boolean;
}) {
  const amountSol = (payment.amountLamports / 1e9).toFixed(4);
  const bucketInfo = BUCKET_LABELS[payment.bucket];

  const statusColor =
    payment.status === "sent"   ? "text-[color:var(--color-emerald)]" :
    payment.status === "failed" ? "text-[#EF4444]" :
    payment.status === "ready"  ? "text-[color:var(--color-amber)]" :
    "text-[color:var(--color-text-muted)]";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[color:var(--color-border-subtle)] last:border-0">
      <div className="mt-[3px] h-[8px] w-[8px] rounded-full shrink-0 mt-[6px]"
        style={{ background: bucketInfo.color }} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[13px] text-[color:var(--color-text-primary)]">
            {amountSol} {payment.token}
          </span>
          {payment.isStealthPayment && (
            <span className="text-[10px] rounded-full px-2 py-[1px] bg-[color:var(--color-accent)] text-white">
              stealth
            </span>
          )}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-[color:var(--color-text-muted)] truncate">
          → {payment.recipient.slice(0, 16)}…
        </div>
        <div className={`mt-0.5 text-[11px] ${statusColor}`}>
          {payment.status === "waiting" && <Countdown executeAt={payment.executeAt} />}
          {payment.status === "ready" && "Signing…"}
          {payment.status === "sent" && `✓ Sent · ${payment.signature?.slice(0, 8)}…`}
          {payment.status === "failed" && `✗ ${payment.error?.slice(0, 40)}`}
        </div>
      </div>

      {payment.status === "waiting" && (
        <button
          type="button"
          onClick={() => onCancel(payment.id)}
          disabled={isProcessing}
          className="text-[11px] text-[color:var(--color-text-muted)] hover:text-[#EF4444] transition-colors shrink-0"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

export function TimeLockPanel() {
  const { queue, cancel, processing } = useTimeLock();

  const active = queue.filter(
    (p) => p.status === "waiting" || p.status === "ready" || p.status === "sent"
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[15px] font-medium text-[color:var(--color-text-primary)]">
          Time-Locked Queue
        </div>
        <div className="mt-1 text-[13px] text-[color:var(--color-text-secondary)] leading-relaxed">
          Payments queued here are dispatched after a random delay, breaking
          timing correlation between when you send and when the chain sees it.
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(BUCKET_LABELS) as [DelayBucket, typeof BUCKET_LABELS[DelayBucket]][]).map(
          ([bucket, info]) => (
            <div
              key={bucket}
              className="cipher-card text-center py-3"
              style={{ borderTopColor: info.color }}
            >
              <div className="text-[12px] font-medium" style={{ color: info.color }}>
                {info.label}
              </div>
              <div className="mt-1 text-[11px] text-[color:var(--color-text-muted)]">
                {info.desc}
              </div>
            </div>
          )
        )}
      </div>

      {active.length === 0 ? (
        <div className="cipher-card text-center py-8">
          <div className="text-[13px] text-[color:var(--color-text-muted)]">
            No queued payments
          </div>
          <div className="mt-1 text-[12px] text-[color:var(--color-text-muted)]">
            Use the Send panel and select a delay bucket to queue a payment
          </div>
        </div>
      ) : (
        <div className="cipher-card divide-y-0">
          {active.map((p) => (
            <PaymentRow
              key={p.id}
              payment={p}
              onCancel={cancel}
              isProcessing={processing === p.id}
            />
          ))}
        </div>
      )}

      <div className="text-[11px] text-[color:var(--color-text-muted)] leading-relaxed">
        Keep this tab open until payments execute. The delay is randomised within
        the chosen bucket — even you cannot predict the exact send time.
      </div>
    </div>
  );
}
