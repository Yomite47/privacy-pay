/**
 * Cipher Pay — Time-Locked Dispatch
 *
 * Breaks timing correlation attacks.
 * Instead of sending immediately, transactions are queued with a
 * randomized delay — an observer watching the chain sees the
 * transaction land at an unpredictable time, making it impossible
 * to correlate "Alice initiated at 14:00" with "stealth address
 * received at 14:47".
 *
 * Why client-side:
 *  Solana transactions expire after ~90 seconds (150 blocks), so we
 *  cannot pre-sign and store. Instead we store the PARAMETERS and
 *  prompt the user to sign at execution time. The delay is real —
 *  the chain only sees the transaction when it's actually submitted.
 *
 * Delay buckets (randomised within each):
 *  Short   2–15 min   (covers casual observers)
 *  Medium  15–60 min  (covers chain analytics tools)
 *  Long    1–6 hours  (covers persistent surveillance)
 */

export type DelayBucket = "short" | "medium" | "long";

export type PendingPaymentStatus = "waiting" | "ready" | "signed" | "sent" | "failed";

export interface PendingPayment {
  id: string;
  createdAt: number;       // when user queued it
  executeAt: number;       // when it should fire (ms timestamp)
  delayMinutes: number;
  bucket: DelayBucket;

  // Payment parameters
  recipient: string;       // stealth address or wallet address
  amountLamports: number;
  token: "SOL" | "USDC";
  encryptedMemo?: string;
  isStealthPayment: boolean;

  status: PendingPaymentStatus;
  signature?: string;
  error?: string;
}

// ─── Delay Logic ──────────────────────────────────────────────────────────────

const BUCKET_RANGES: Record<DelayBucket, [number, number]> = {
  short:  [2,   15],
  medium: [15,  60],
  long:   [60,  360],
};

export function randomDelayMinutes(bucket: DelayBucket): number {
  const [min, max] = BUCKET_RANGES[bucket];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatDelay(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// ─── Queue Management ─────────────────────────────────────────────────────────

const STORAGE_KEY = "cipherpay:time-lock-queue";

export function loadQueue(): PendingPayment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingPayment[]) : [];
  } catch {
    return [];
  }
}

export function saveQueue(queue: PendingPayment[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function enqueue(params: {
  recipient: string;
  amountLamports: number;
  token: "SOL" | "USDC";
  bucket: DelayBucket;
  encryptedMemo?: string;
  isStealthPayment?: boolean;
}): PendingPayment {
  const delayMinutes = randomDelayMinutes(params.bucket);
  const now = Date.now();

  const payment: PendingPayment = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    executeAt: now + delayMinutes * 60 * 1000,
    delayMinutes,
    bucket: params.bucket,
    recipient: params.recipient,
    amountLamports: params.amountLamports,
    token: params.token,
    encryptedMemo: params.encryptedMemo,
    isStealthPayment: params.isStealthPayment ?? false,
    status: "waiting",
  };

  const queue = loadQueue();
  queue.push(payment);
  saveQueue(queue);

  return payment;
}

export function updatePayment(
  id: string,
  updates: Partial<PendingPayment>
): void {
  const queue = loadQueue();
  const idx = queue.findIndex((p) => p.id === id);
  if (idx === -1) return;
  queue[idx] = { ...queue[idx], ...updates };
  saveQueue(queue);
}

export function removePayment(id: string): void {
  const queue = loadQueue().filter((p) => p.id !== id);
  saveQueue(queue);
}

export function getReadyPayments(): PendingPayment[] {
  const now = Date.now();
  return loadQueue().filter(
    (p) => p.status === "waiting" && p.executeAt <= now
  );
}

export function getPendingPayments(): PendingPayment[] {
  return loadQueue().filter(
    (p) => p.status === "waiting" || p.status === "ready"
  );
}
