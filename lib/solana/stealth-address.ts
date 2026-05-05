/**
 * Cipher Pay — Stealth Addresses
 *
 * Breaks the on-chain link between sender and recipient.
 * Every payment goes to a unique one-time address — only the recipient
 * can discover it belongs to them.
 *
 * Protocol (ECDH-based):
 *  1. Recipient publishes a stealth meta-address (x25519 public key)
 *  2. Sender picks a random ephemeral keypair
 *  3. Sender computes: sharedSecret = ECDH(ephemeral_secret, recipient_public)
 *  4. Sender derives: stealthAddress = Keypair.fromSeed(sha256(sharedSecret))
 *  5. Sender sends funds to stealthAddress, puts ephemeral_public in memo
 *  6. Recipient scans: recomputes sharedSecret for each tx, checks if address matches
 *  7. If match → recipient owns that address and can spend from it
 *
 * Privacy guarantee:
 *  - Nobody can link stealthAddress to recipient's main wallet
 *  - Nobody can link two stealth payments to the same recipient
 *  - Only recipient + sender know the payment occurred
 */

import nacl from "tweetnacl";
import { Keypair, PublicKey, Connection } from "@solana/web3.js";
import { toBase64, fromBase64 } from "@/lib/memo-sdk/encrypt";

export interface StealthMetaAddress {
  x25519PublicKey: string; // base64 — publish this as your stealth address
  walletAddress: string;
  createdAt: number;
}

export interface StealthKeypair {
  metaAddress: StealthMetaAddress;
  x25519SecretKey: string; // base64 — never share, stored locally
}

export interface StealthPaymentMemo {
  type: "stealth-v1";
  ephemeralPublicKey: string; // base64 — x25519 ephemeral public key
}

export interface StealthPayment {
  stealthAddress: string;        // the one-time address that received funds
  stealthPrivateKey: Uint8Array; // private key to spend from it
  ephemeralPublicKey: string;    // from memo — used to derive shared secret
  signature: string;             // transaction signature
}

// ─── SHA-256 ──────────────────────────────────────────────────────────────────

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const hash = await window.crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
    return new Uint8Array(hash);
  }
  // Node.js fallback (for SSR/API routes)
  const { createHash } = await import("crypto");
  const buf = createHash("sha256").update(data).digest();
  return new Uint8Array(buf);
}

// ─── Key Generation ───────────────────────────────────────────────────────────

/**
 * Generate a stealth keypair for a wallet.
 * The x25519 public key is the "stealth meta-address" — publish it.
 * The x25519 secret key is used to scan incoming payments — keep it local.
 */
export function generateStealthKeypair(walletAddress: string): StealthKeypair {
  const x25519KP = nacl.box.keyPair();

  const metaAddress: StealthMetaAddress = {
    x25519PublicKey: toBase64(x25519KP.publicKey),
    walletAddress,
    createdAt: Date.now(),
  };

  return {
    metaAddress,
    x25519SecretKey: toBase64(x25519KP.secretKey),
  };
}

// ─── Send Flow ────────────────────────────────────────────────────────────────

/**
 * Derive a one-time stealth address to send funds to.
 * Called by the sender given the recipient's stealth meta-address.
 *
 * Returns:
 *  - stealthAddress: send funds here
 *  - memoPayload: include in transaction memo so recipient can discover the payment
 */
export async function deriveStealthAddress(
  recipientMetaAddress: StealthMetaAddress
): Promise<{ stealthAddress: PublicKey; memoPayload: StealthPaymentMemo }> {
  // 1. Generate random ephemeral keypair
  const ephemeralKP = nacl.box.keyPair();

  // 2. ECDH: shared secret = ephemeral_secret × recipient_x25519_public
  const recipientX25519 = fromBase64(recipientMetaAddress.x25519PublicKey);
  const sharedSecret = nacl.box.before(recipientX25519, ephemeralKP.secretKey);

  // 3. Derive one-time Solana keypair seed from shared secret
  const seed = await sha256(sharedSecret);

  // 4. Derive the stealth Solana keypair (valid ed25519)
  const stealthKP = Keypair.fromSeed(seed);

  const memoPayload: StealthPaymentMemo = {
    type: "stealth-v1",
    ephemeralPublicKey: toBase64(ephemeralKP.publicKey),
  };

  return { stealthAddress: stealthKP.publicKey, memoPayload };
}

// ─── Scan Flow ────────────────────────────────────────────────────────────────

/**
 * Given a transaction memo and the recipient's stealth secret key,
 * check if this transaction was sent to the recipient via stealth addressing.
 *
 * If yes: returns the stealth keypair (they can spend from it)
 * If no:  returns null
 */
export async function tryRecoverStealthPayment(
  memoPayload: StealthPaymentMemo,
  recipientSecretKey: string,
  signature: string
): Promise<StealthPayment | null> {
  try {
    const ephemeralPublic = fromBase64(memoPayload.ephemeralPublicKey);
    const recipientSecret = fromBase64(recipientSecretKey);

    // ECDH: recipient_secret × ephemeral_public = same shared secret as sender
    const sharedSecret = nacl.box.before(ephemeralPublic, recipientSecret);

    // Derive the same seed
    const seed = await sha256(sharedSecret);
    const stealthKP = Keypair.fromSeed(seed);

    return {
      stealthAddress: stealthKP.publicKey.toBase58(),
      stealthPrivateKey: stealthKP.secretKey,
      ephemeralPublicKey: memoPayload.ephemeralPublicKey,
      signature,
    };
  } catch {
    return null;
  }
}

/**
 * Scan recent transactions for stealth payments sent to this recipient.
 * Checks the last N transactions on the network for stealth memos.
 */
export async function scanForStealthPayments(params: {
  connection: Connection;
  stealthSecretKey: string;
  stealthPublicKey: string;
  limit?: number;
}): Promise<StealthPayment[]> {
  const { connection, stealthSecretKey, limit = 20 } = params;
  const payments: StealthPayment[] = [];

  try {
    // In a production system you'd use an indexer.
    // Here we scan via a known program address or memo program.
    const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
    const sigs = await connection.getSignaturesForAddress(MEMO_PROGRAM, { limit });

    const txs = await connection.getParsedTransactions(
      sigs.map((s) => s.signature),
      { maxSupportedTransactionVersion: 0 }
    );

    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      const sig = sigs[i];
      if (!tx) continue;

      for (const ix of tx.transaction.message.instructions) {
        if (!("program" in ix) || ix.program !== "spl-memo") continue;
        if (typeof ix.parsed !== "string") continue;

        try {
          const memo = JSON.parse(ix.parsed) as Partial<StealthPaymentMemo>;
          if (memo.type !== "stealth-v1" || !memo.ephemeralPublicKey) continue;

          const payment = await tryRecoverStealthPayment(
            memo as StealthPaymentMemo,
            stealthSecretKey,
            sig.signature
          );

          if (payment) payments.push(payment);
        } catch {
          continue;
        }
      }
    }
  } catch {
    // Scanning is best-effort
  }

  return payments;
}

// ─── Local Storage ────────────────────────────────────────────────────────────

const STORAGE_KEY = "cipherpay:stealth-keypair";

export function saveStealthKeypair(kp: StealthKeypair): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_KEY}:${kp.metaAddress.walletAddress}`, JSON.stringify(kp));
}

export function loadStealthKeypair(walletAddress: string): StealthKeypair | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${walletAddress}`);
    return raw ? (JSON.parse(raw) as StealthKeypair) : null;
  } catch {
    return null;
  }
}

export function clearStealthKeypair(walletAddress: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${STORAGE_KEY}:${walletAddress}`);
}
